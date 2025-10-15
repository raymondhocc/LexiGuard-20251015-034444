import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, ShieldAlert, Clock, Loader2, Filter } from "lucide-react";
import { reportingService, type DashboardMetrics, type ChartDataPoint, type ReportFilterOptions } from '@/lib/reporting-service';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CaseStatus } from '../../worker/types';
const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
const caseStatuses: CaseStatus[] = ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'CLOSED', 'ARCHIVED'];
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2"><div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">{label || payload[0].name}</span><span className="font-bold text-muted-foreground">{payload[0].name}</span></div><div className="flex flex-col space-y-1"><span className="text-[0.70rem] uppercase text-muted-foreground">Value</span><span className="font-bold">{payload[0].value}</span></div></div>
      </div>
    );
  }
  return null;
};
export function ReportingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [complianceTrendData, setComplianceTrendData] = useState<ChartDataPoint[]>([]);
  const [riskDistributionData, setRiskDistributionData] = useState<ChartDataPoint[]>([]);
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'ALL'>('ALL');
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ReportFilterOptions = {
        startDate: date?.from?.getTime(),
        endDate: date?.to?.getTime(),
        caseStatus: statusFilter === 'ALL' ? [] : [statusFilter],
      };
      const [metricsData, trendData, riskData] = await Promise.all([
        reportingService.getDashboardMetrics(filters),
        reportingService.getComplianceTrendData(filters),
        reportingService.getRiskDistributionData(filters),
      ]);
      setMetrics(metricsData);
      setComplianceTrendData(trendData);
      setRiskDistributionData(riskData);
    } catch (error) {
      toast.error("Failed to load reporting data.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [date, statusFilter]);
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <div className="space-y-8">
          <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-2">
            <h1 className="text-4xl font-bold font-display">Reporting & Analytics</h1>
            <p className="text-lg text-muted-foreground">Gain insights into compliance, risk, and operational efficiency.</p>
          </motion.header>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Adjust the parameters for the reports below.</CardDescription>
              </div>
              <Button onClick={fetchReportData}><Filter className="mr-2 h-4 w-4" /> Apply Filters</Button>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Popover><PopoverTrigger asChild><Button variant={"outline"}>{date?.from ? (date.to ? <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</> : format(date.from, "LLL dd, y")) : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} /></PopoverContent></Popover>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Case Status" /></SelectTrigger><SelectContent><SelectItem value="ALL">All Statuses</SelectItem>{caseStatuses.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
            </CardContent>
          </Card>
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Documents Processed</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.documentsProcessed ?? 'N/A'}</div><p className="text-xs text-muted-foreground">Total documents in the system</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Open Risks</CardTitle><ShieldAlert className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.risksFlagged ?? 'N/A'}</div><p className="text-xs text-muted-foreground">Currently open cases</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg. Case Resolution</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.avgCaseResolutionDays ?? 'N/A'} Days</div><p className="text-xs text-muted-foreground">For all closed cases</p></CardContent></Card>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <Card><CardHeader><CardTitle>Risk Distribution</CardTitle><CardDescription>Breakdown of cases by risk category.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={riskDistributionData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{riskDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none ring-2 ring-offset-2 ring-primary" />))}</Pie><Tooltip content={<CustomTooltip />} /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card><CardHeader><CardTitle>Quarterly Compliance Trend</CardTitle><CardDescription>Average compliance score of cases created per quarter.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={complianceTrendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[80, 100]} unit="%" /><Tooltip content={<CustomTooltip />} /><Legend /><Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}