"use client";

/**
 * LabTrendChart.tsx — Trend chart for lab parameters using Recharts
 *
 * Features:
 * - Dropdown to select parameter (fetched from GET /api/lab/parameters)
 * - Line chart showing nilai over tanggalPemeriksaan
 * - 30-day lookback by default
 * - Handles non-numeric values gracefully
 *
 * Pattern: standalone card with dropdown + chart.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, FlaskConical } from "lucide-react";

interface TrendPoint {
  tanggalPemeriksaan: string;
  nilai: string;
  satuan: string | null;
}

interface TrendResponse {
  parameter: string;
  days: number;
  data: TrendPoint[];
}

interface LabTrendChartProps {
  accessToken: string;
  refreshKey?: number;
  /** Fires whenever the selected parameter changes (initial auto-select
   * included) so a sibling component (e.g. LabAnalysisCard) can stay
   * synced to the same parameter the user is viewing. */
  onParameterChange?: (parameter: string) => void;
}

export default function LabTrendChart({
  accessToken,
  refreshKey = 0,
  onParameterChange,
}: LabTrendChartProps) {
  const [parameters, setParameters] = useState<string[]>([]);
  const [selectedParam, setSelectedParam] = useState<string>("");
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [satuan, setSatuan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch available parameters
  const fetchParameters = useCallback(async () => {
    try {
      const data = await authFetch<{ parameters: string[] }>(
        "/api/lab/parameters",
        accessToken,
      );
      const params = (data.parameters ?? []).filter(p => 
        p && p.toLowerCase() !== 'dokumen lab' && !p.toLowerCase().includes('.pdf') && !p.toLowerCase().includes('.jpg') && !p.toLowerCase().includes('.png')
      );
      setParameters(params);
      // Auto-select first parameter if none selected
      if (params.length > 0 && !selectedParam) {
        setSelectedParam(params[0]);
      }
    } catch {
      setParameters([]);
    } finally {
      setInitialLoading(false);
    }
  }, [accessToken, selectedParam]);

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters, refreshKey]);

  // Fetch trend data when parameter changes
  const fetchTrend = useCallback(async () => {
    if (!selectedParam) {
      setTrendData([]);
      return;
    }

    try {
      setLoading(true);
      const data = await authFetch<TrendResponse>(
        `/api/lab/trend?parameter=${encodeURIComponent(selectedParam)}&days=90`,
        accessToken,
      );
      // Filter to numeric values only for chart
      const numericData = (data.data ?? []).filter((p) => {
        const num = parseFloat(p.nilai);
        return !isNaN(num);
      });
      setTrendData(numericData);
      setSatuan(numericData.length > 0 ? numericData[0].satuan : null);
    } catch {
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedParam, accessToken]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend, refreshKey]);

  // Notify parent whenever the selected parameter changes (including the
  // initial auto-select), so LabAnalysisCard can track the same parameter.
  useEffect(() => {
    if (selectedParam) onParameterChange?.(selectedParam);
  }, [selectedParam, onParameterChange]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const chartData = trendData.map((p) => ({
    date: formatDate(p.tanggalPemeriksaan),
    fullDate: p.tanggalPemeriksaan,
    nilai: parseFloat(p.nilai),
  }));

  if (initialLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground font-sans">Memuat...</p>
        </div>
      </div>
    );
  }

  if (parameters.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-sans font-semibold text-foreground">
            Tren Parameter Lab
          </h3>
        </div>
        <div className="text-center py-4">
          <FlaskConical className="w-8 h-8 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-sans text-muted-foreground">
            Belum ada data parameter untuk ditampilkan
          </p>
          <p className="text-xs font-sans text-muted-foreground mt-0.5">
            Tambahkan hasil lab manual untuk melihat tren
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-sans font-semibold text-foreground">
          Tren Parameter Lab
        </h3>
      </div>

      {/* Parameter dropdown */}
      <select
        value={selectedParam}
        onChange={(e) => setSelectedParam(e.target.value)}
        className="w-full rounded-[10px] border border-border bg-input px-3 py-2 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-3"
      >
        {parameters.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground font-sans">Memuat data...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs font-sans text-muted-foreground">
            {selectedParam
              ? `Belum ada data numerik untuk ${selectedParam}`
              : "Pilih parameter untuk melihat tren"}
          </p>
        </div>
      ) : (
        <div>
          <div className="text-xs font-sans text-muted-foreground mb-2">
            {selectedParam}{satuan ? ` (${satuan})` : ""} — 90 hari terakhir
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fontFamily: "var(--font-sans, ui-sans-serif)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "var(--font-sans, ui-sans-serif)" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.1)",
                  fontSize: 12,
                  fontFamily: "var(--font-sans, ui-sans-serif)",
                }}
                labelFormatter={(label, payload) => {
                  if (payload?.[0]?.payload?.fullDate) {
                    const d = new Date(payload[0].payload.fullDate + "T00:00:00");
                    return d.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                  }
                  return label;
                }}
                formatter={(value, name, props) => {
                  if (typeof value === 'number') {
                    return [
                      `${value}${satuan ? ` ${satuan}` : ""}`,
                      selectedParam,
                    ];
                  }
                  return [String(value), name];
                }}
              />
              <Line
                type="monotone"
                dataKey="nilai"
                stroke="#2a9d8f"
                strokeWidth={2}
                dot={{ fill: "#2a9d8f", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
