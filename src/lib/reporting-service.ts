import { documentService } from './document-service';
import { auditService } from './audit-service';
import { caseService } from './case-service';
import type { DocumentMetadata } from './document-service';
import type { Case, ReportFilterOptions } from '../../worker/types';
import { differenceInDays, parseISO, startOfQuarter, format } from 'date-fns';
export type { ReportFilterOptions };
export interface DashboardMetrics {
  documentsProcessed: number;
  risksFlagged: number;
  avgCaseResolutionDays: number;
}
export interface ChartDataPoint {
  name: string;
  [key: string]: any;
}
class ReportingApiService {
  private applyFilters(cases: Case[], filters?: ReportFilterOptions): Case[] {
    if (!filters) return cases;
    return cases.filter(c => {
      const createdAt = new Date(c.createdAt);
      if (filters.startDate && createdAt < filters.startDate) return false;
      if (filters.endDate && createdAt > filters.endDate) return false;
      if (filters.caseStatus && filters.caseStatus.length > 0 && !filters.caseStatus.includes(c.status)) return false;
      // Severity filtering would require linking cases to risks/rules, which is not yet implemented.
      // This is a placeholder for that logic.
      return true;
    });
  }
  async getDashboardMetrics(filters?: ReportFilterOptions): Promise<DashboardMetrics> {
    const [docsRes, casesRes] = await Promise.all([
      documentService.getDocuments(),
      caseService.getCases(),
    ]);
    const documentsProcessed = docsRes.success && docsRes.data ? docsRes.data.length : 0;
    const allCases = casesRes.success && casesRes.data ? casesRes.data : [];
    const filteredCases = this.applyFilters(allCases, filters);
    const risksFlagged = filteredCases.filter(c => c.status !== 'CLOSED').length;
    let totalResolutionDays = 0;
    let resolvedCasesCount = 0;
    filteredCases.forEach(c => {
      if (c.status === 'CLOSED') {
        totalResolutionDays += differenceInDays(new Date(c.lastModified), new Date(c.createdAt));
        resolvedCasesCount++;
      }
    });
    const avgCaseResolutionDays = resolvedCasesCount > 0 ? Math.round(totalResolutionDays / resolvedCasesCount) : 0;
    return { documentsProcessed, risksFlagged, avgCaseResolutionDays };
  }
  async getComplianceTrendData(filters?: ReportFilterOptions): Promise<ChartDataPoint[]> {
    const casesRes = await caseService.getCases();
    if (!casesRes.success || !casesRes.data) return [];
    const filteredCases = this.applyFilters(casesRes.data, filters);
    const quarterlyData: { [key: string]: { score: number, count: number } } = {};
    filteredCases.forEach(c => {
      const quarter = format(new Date(c.createdAt), 'yyyy-QQ');
      if (!quarterlyData[quarter]) {
        quarterlyData[quarter] = { score: 0, count: 0 };
      }
      quarterlyData[quarter].score += c.status === 'CLOSED' ? 100 : 85;
      quarterlyData[quarter].count++;
    });
    return Object.entries(quarterlyData)
      .map(([name, { score, count }]) => ({
        name: name.replace('-', ' Q'),
        score: Math.round(score / count),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  async getRiskDistributionData(filters?: ReportFilterOptions): Promise<ChartDataPoint[]> {
     const casesRes = await caseService.getCases();
    if (!casesRes.success || !casesRes.data) return [];
    const filteredCases = this.applyFilters(casesRes.data, filters);
    const distribution: { [key: string]: number } = {
        'AML': 0, 'GDPR': 0, 'KYC': 0, 'Fraud': 0, 'Other': 0,
    };
    filteredCases.forEach(c => {
        const title = c.title.toLowerCase();
        if (title.includes('aml')) distribution['AML']++;
        else if (title.includes('gdpr')) distribution['GDPR']++;
        else if (title.includes('kyc')) distribution['KYC']++;
        else if (title.includes('fraud')) distribution['Fraud']++;
        else distribution['Other']++;
    });
    return Object.entries(distribution)
        .map(([name, value]) => ({ name, value }))
        .filter(d => d.value > 0);
  }
}
export const reportingService = new ReportingApiService();