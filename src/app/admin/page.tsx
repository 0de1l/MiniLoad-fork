'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    FiSave,
    FiTerminal,
    FiImage,
    FiEdit3,
    FiLock,
    FiAlertTriangle,
    FiHome,
    FiLogOut,
    FiCheck,
    FiPlus,
    FiList,
    FiTrash2,
    FiChevronRight,
    FiMessageSquare,
    FiCornerUpLeft,
    FiBarChart2,
    FiTrendingUp
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type AdminType = 'dashboard' | 'post' | 'daily' | 'moment' | 'comment';


type PostData = {
    title: string;
    date: string;
    description: string;
    content: string;
    slug: string;
    category: string;
};

type DailyData = {
    date: string;
    imageUrl: string;
    content: string;
};

type MomentData = {
    title: string;
    date: string;
    imageUrl: string;
    content: string;
};

type AdminItem = {
    filename: string;
    date: string;
    title?: string;
    description?: string;
    content?: string;
    slug?: string;
    imageUrl?: string;
    category?: string;
    nickname?: string;
    contact?: string;
    articleTitle?: string;
    created_at?: string;
};

type StatusMessage = { text: string; isError: boolean };

type DashboardData = {
    posts: AdminItem[];
    daily: AdminItem[];
    moments: AdminItem[];
    analytics: AnalyticsSummary;
};

type ChartRange = '7d' | '30d';

type AnalyticsPoint = {
    date: string;
    views: number;
    visitors: number;
};

type AnalyticsSummary = {
    totalViews: number;
    todayViews: number;
    uniqueVisitors: number;
    series: Record<ChartRange, AnalyticsPoint[]>;
};

const buildEmptyAnalytics = (): AnalyticsSummary => ({
    totalViews: 0,
    todayViews: 0,
    uniqueVisitors: 0,
    series: {
        '7d': buildDateRange(7).map((date) => ({ date, views: 0, visitors: 0 })),
        '30d': buildDateRange(30).map((date) => ({ date, views: 0, visitors: 0 })),
    },
});

const buildDateRange = (days: number) => {
    const dates: string[] = [];
    const now = new Date();

    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        date.setUTCDate(date.getUTCDate() - offset);
        dates.push(date.toISOString().slice(0, 10));
    }

    return dates;
};

const formatMetric = (value: number) => new Intl.NumberFormat('en-US').format(value);

const getItemTextLength = (item: AdminItem) => {
    return [item.title, item.description, item.content]
        .filter(Boolean)
        .join('\n')
        .trim()
        .length;
};

const buildChartPath = (values: number[], width = 640, height = 210, padding = 30) => {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const points = values.map((value, index) => {
        const x = padding + (index / Math.max(values.length - 1, 1)) * innerWidth;
        const y = padding + (1 - (value - min) / span) * innerHeight;
        return [x, y] as const;
    });
    const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const area = `${line} L ${(width - padding).toFixed(1)} ${(height - padding).toFixed(1)} L ${padding.toFixed(1)} ${(height - padding).toFixed(1)} Z`;
    return { line, area, points, max };
};

function TrendChart({
    title,
    range,
    onRangeChange,
    values,
    unit,
}: {
    title: string;
    range: ChartRange;
    onRangeChange: (range: ChartRange) => void;
    values: number[];
    unit: string;
}) {
    const { line, area, points, max } = buildChartPath(values);
    const latest = values[values.length - 1] || 0;
    const previous = values[values.length - 2] || latest;
    const delta = latest - previous;
    const grid = [0.2, 0.4, 0.6, 0.8];

    return (
        <section className="rounded-[4px] border border-neutral-900 bg-neutral-950/80 p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-neutral-200">{title}</h2>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                        最新: <span className="text-neutral-400">{formatMetric(latest)} {unit}</span>
                        <span className={delta >= 0 ? 'ml-2 text-green-400/70' : 'ml-2 text-red-400/70'}>
                            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}
                        </span>
                    </p>
                </div>
                <div className="flex rounded-[4px] border border-neutral-800 bg-neutral-900/50 p-0.5">
                    {(['7d', '30d'] as const).map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => onRangeChange(option)}
                            className={`h-7 rounded-[3px] px-3 font-mono text-[9px] uppercase tracking-widest transition-colors ${range === option
                                ? 'bg-neutral-800 text-white'
                                : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                        >
                            {option === '7d' ? '近一周' : '近30天'}
                        </button>
                    ))}
                </div>
            </div>
            <svg viewBox="0 0 640 210" className="h-[230px] w-full overflow-visible" role="img" aria-label={title}>
                <defs>
                    <linearGradient id={`${title}-area`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#75a7ff" stopOpacity="0.36" />
                        <stop offset="100%" stopColor="#75a7ff" stopOpacity="0.04" />
                    </linearGradient>
                </defs>
                {grid.map((lineY) => {
                    const y = 30 + lineY * 150;
                    return <line key={lineY} x1="30" x2="610" y1={y} y2={y} stroke="rgba(255,255,255,.14)" strokeWidth="1" />;
                })}
                <line x1="30" x2="610" y1="180" y2="180" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
                <text x="8" y="35" className="fill-neutral-600 font-mono text-[10px]">{max}</text>
                <text x="14" y="184" className="fill-neutral-600 font-mono text-[10px]">0</text>
                <path d={area} fill={`url(#${title}-area)`} />
                <path d={line} fill="none" stroke="#75a7ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map(([x, y], index) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r={index === points.length - 1 ? 4 : 2.5} fill="#9abfff" stroke="#090a0a" strokeWidth="2" />
                ))}
                <text x="30" y="205" className="fill-neutral-600 font-mono text-[10px]">{range === '7d' ? '前6天' : '前29天'}</text>
                <text x="566" y="205" className="fill-neutral-600 font-mono text-[10px]">今天</text>
            </svg>
        </section>
    );
}

function DashboardView({
    data,
    loading,
}: {
    data: DashboardData;
    loading: boolean;
}) {
    const [visitorRange, setVisitorRange] = useState<ChartRange>('7d');
    const [viewRange, setViewRange] = useState<ChartRange>('7d');
    const postCount = data.posts.length;
    const totalContent = data.posts.length + data.daily.length + data.moments.length;
    const totalWords = [...data.posts, ...data.daily, ...data.moments].reduce((sum, item) => sum + getItemTextLength(item), 0);

    const cards = [
        { label: '文章数', value: postCount, meta: '文章档案', icon: <FiEdit3 className="h-4 w-4" /> },
        { label: '总字数', value: totalWords, meta: 'Markdown 字符', icon: <FiTerminal className="h-4 w-4" /> },
        { label: '总内容数', value: totalContent, meta: '文章 + 日常 + 瞬间', icon: <FiList className="h-4 w-4" /> },
        { label: '总访问量', value: data.analytics.totalViews, meta: `今日新增 ${formatMetric(data.analytics.todayViews)} 次`, icon: <FiTrendingUp className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <section
                        key={card.label}
                        className="relative overflow-hidden rounded-[4px] border border-neutral-900 bg-neutral-950 p-5 shadow-sm"
                    >
                        <div className="absolute right-4 top-4 text-neutral-700">{card.icon}</div>
                        <p className="text-sm font-bold text-neutral-500">{card.label}</p>
                        <div className="mt-5 text-4xl font-semibold tracking-tight text-neutral-100">
                            {loading ? '...' : formatMetric(card.value)}
                        </div>
                        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600">{card.meta}</p>
                    </section>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <TrendChart
                    title="访客趋势图"
                    range={visitorRange}
                    onRangeChange={setVisitorRange}
                    values={data.analytics.series[visitorRange].map((point) => point.visitors)}
                    unit="人"
                />
                <TrendChart
                    title="访问量趋势图"
                    range={viewRange}
                    onRangeChange={setViewRange}
                    values={data.analytics.series[viewRange].map((point) => point.views)}
                    unit="次"
                />
            </div>
        </div>
    );
}

const escapeHtml = (value: string) => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const renderInlineMarkdown = (value: string) => {
    return escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
};

const renderMarkdownPreview = (markdown: string) => {
    if (!markdown.trim()) {
        return '<p class="text-neutral-600 font-mono text-xs uppercase tracking-widest">Preview_Waiting_For_Input</p>';
    }

    const blocks = markdown.split(/\n{2,}/);

    return blocks.map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        if (trimmed.startsWith('```')) {
            const code = trimmed.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '');
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        }

        if (trimmed.startsWith('# ')) return `<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`;
        if (trimmed.startsWith('## ')) return `<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`;
        if (trimmed.startsWith('### ')) return `<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`;

        if (trimmed.startsWith('>')) {
            const quote = trimmed.split('\n').map(line => line.replace(/^>\s?/, '')).join('<br />');
            return `<blockquote><p>${renderInlineMarkdown(quote)}</p></blockquote>`;
        }

        if (/^- /.test(trimmed)) {
            const items = trimmed.split('\n').map(line => `<li>${renderInlineMarkdown(line.replace(/^- /, ''))}</li>`).join('');
            return `<ul>${items}</ul>`;
        }

        return `<p>${renderInlineMarkdown(trimmed).replace(/\n/g, '<br />')}</p>`;
    }).join('');
};

export default function AdminPage() {
    const postContentRef = useRef<HTMLTextAreaElement | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [type, setType] = useState<AdminType>('dashboard');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [message, setMessage] = useState<StatusMessage | null>(null);


    // Form states
    const today = new Date().toISOString().split('T')[0];
    const defaultSlug = today.replace(/-/g, '').slice(2); // YYMMDD

    const [postData, setPostData] = useState<PostData>({ title: '', date: today, description: '', content: '', slug: defaultSlug, category: '' });
    const [isSlugModified, setIsSlugModified] = useState(false);
    const [dailyData, setDailyData] = useState<DailyData>({ date: today, imageUrl: '', content: '' });
    const [momentData, setMomentData] = useState<MomentData>({ title: '', date: today, imageUrl: '', content: '' });
    const [existingPosts, setExistingPosts] = useState<AdminItem[]>([]);
    const [dashboardData, setDashboardData] = useState<DashboardData>({ posts: [], daily: [], moments: [], analytics: buildEmptyAnalytics() });
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentFilename, setCurrentFilename] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'edit' | 'list'>('list');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Delete Confirmation State
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Reply Dialog State

    const [replyTarget, setReplyTarget] = useState<AdminItem | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [replyModalOpen, setReplyModalOpen] = useState(false);


    // Helper to format date to slug
    const dateToSlug = (dateStr: string) => {
        return dateStr.replace(/-/g, '').slice(2);
    };

    // Handle Authentication
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError(false);

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                setIsAuthorized(true);
                localStorage.setItem('admin_key', password);
                fetchPosts(password);
            } else {
                setAuthError(true);
                setPassword('');
            }
        } catch {
            setAuthError(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardData = useCallback(async (token?: string) => {
        try {
            const adminKey = token || localStorage.getItem('admin_key') || '';
            setDashboardLoading(true);
            const [postsRes, dailyRes, momentsRes, analyticsRes] = await Promise.all([
                ...(['post', 'daily', 'moment'] as const).map((targetType) => fetch(`/api/admin/list?type=${targetType}`, {
                    headers: { 'Authorization': adminKey }
                })),
                fetch('/api/admin/analytics', {
                    headers: { 'Authorization': adminKey }
                }),
            ]);

            if ([postsRes, dailyRes, momentsRes, analyticsRes].some((res) => res.status === 401)) {
                setIsAuthorized(false);
                return;
            }

            const [postsData, dailyDataRes, momentsData, analyticsData] = await Promise.all([
                postsRes.json() as Promise<{ items: AdminItem[] }>,
                dailyRes.json() as Promise<{ items: AdminItem[] }>,
                momentsRes.json() as Promise<{ items: AdminItem[] }>,
                analyticsRes.ok ? analyticsRes.json() as Promise<AnalyticsSummary> : Promise.resolve(buildEmptyAnalytics()),
            ]);

            setDashboardData({
                posts: postsData.items || [],
                daily: dailyDataRes.items || [],
                moments: momentsData.items || [],
                analytics: analyticsData || buildEmptyAnalytics(),
            });
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setDashboardLoading(false);
        }
    }, []);

    const fetchPosts = useCallback(async (token?: string) => {
        if (type === 'dashboard') {
            await fetchDashboardData(token);
            return;
        }

        try {
            const adminKey = token || localStorage.getItem('admin_key') || '';
            setListLoading(true);
            const res = await fetch(`/api/admin/list?type=${type}`, {
                headers: { 'Authorization': adminKey }
            });
            if (res.ok) {
                const data = await res.json() as { items: AdminItem[] };
                setExistingPosts(data.items || []);
            } else {
                if (res.status === 401) setIsAuthorized(false);
            }
        } catch (error) {
            console.error('Failed to fetch posts', error);
        } finally {
            setListLoading(false);
        }

    }, [fetchDashboardData, type]);

    useEffect(() => {
        let cancelled = false;

        queueMicrotask(() => {
            if (cancelled) return;

            const key = localStorage.getItem('admin_key');
            if (key) {
                setIsAuthorized(true);
                fetchPosts(key);
            }
            setCheckingAuth(false);
        });

        return () => {
            cancelled = true;
        };
    }, [fetchPosts]);

    useEffect(() => {
        if (viewMode === 'list' && isAuthorized) {
            fetchPosts();
        }
    }, [viewMode, isAuthorized, fetchPosts]);

    const handleEditPost = (item: AdminItem) => {
        if (type === 'post') {
            setPostData({
                title: item.title || '',
                date: item.date,
                description: item.description || '',
                content: item.content || '',
                slug: item.slug || defaultSlug,
                category: item.category || ''
            });
        } else if (type === 'daily') {
            setDailyData({
                date: item.date,
                content: item.content || '',
                imageUrl: item.imageUrl || ''
            });
        } else if (type === 'moment') {
            setMomentData({
                title: item.title || '',
                date: item.date,
                imageUrl: item.imageUrl || '',
                content: item.content || ''
            });
        }

        setCurrentFilename(item.filename);
        setIsEditing(true);
        setViewMode('edit');
    };

    const handleNewPost = () => {
        setPostData({ title: '', date: today, description: '', content: '', slug: defaultSlug, category: '' });
        setIsSlugModified(false);
        setIsEditing(false);
        setCurrentFilename(null);
        setViewMode('edit');
    };

    const handleNewItem = () => {
        if (type === 'post') {
            handleNewPost();
        } else if (type === 'daily') {
            setDailyData({ date: today, imageUrl: '', content: '' });
            setIsEditing(false);
            setCurrentFilename(null);
            setViewMode('edit');
        } else if (type === 'moment') {
            setMomentData({ title: '', date: today, imageUrl: '', content: '' });
            setIsEditing(false);
            setCurrentFilename(null);
            setViewMode('edit');
        }
    };

    const updatePostContent = (content: string) => {
        setPostData(prev => ({ ...prev, content }));
    };

    const insertPostMarkdown = (before: string, after = '', placeholder = 'text') => {
        const textarea = postContentRef.current;
        const current = postData.content;
        const start = textarea?.selectionStart ?? current.length;
        const end = textarea?.selectionEnd ?? current.length;
        const selected = current.slice(start, end) || placeholder;
        const nextContent = `${current.slice(0, start)}${before}${selected}${after}${current.slice(end)}`;

        updatePostContent(nextContent);

        requestAnimationFrame(() => {
            textarea?.focus();
            const cursorStart = start + before.length;
            const cursorEnd = cursorStart + selected.length;
            textarea?.setSelectionRange(cursorStart, cursorEnd);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any = {};
        if (type === 'post') {
            data = { ...postData, filename: currentFilename };
        }
        else if (type === 'daily') data = dailyData;
        else if (type === 'moment') data = momentData;

        try {
            const adminKey = localStorage.getItem('admin_key') || '';
            const res = await fetch('/api/admin/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminKey
                },
                body: JSON.stringify({ type, data }),
            });

            if (res.status === 401) {
                localStorage.removeItem('admin_key');
                setIsAuthorized(false);
                setMessage({ text: 'PERMISSION_DENIED: AUTH_EXPIRED', isError: true });
                return;
            }

            const result = await res.json() as { success?: boolean; error?: string };
            if (result.success) {
                setMessage({ text: `SUCCESS: ${type.toUpperCase()} SAVED`, isError: false });
                if (type === 'post') {
                    handleNewPost();
                    fetchPosts();
                }
                else if (type === 'daily') setDailyData({ date: today, imageUrl: '', content: '' });
                else if (type === 'moment') setMomentData({ title: '', date: today, imageUrl: '', content: '' });

                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ text: `ERROR: ${result.error}`, isError: true });
            }
        } catch {
            setMessage({ text: 'NETWORK ERROR: CONNECTION LOST', isError: true });
        } finally {
            setLoading(false);
        }
    };

    const handleReply = (e: React.MouseEvent, item: AdminItem) => {
        e.stopPropagation();
        setReplyTarget(item);
        setReplyContent('');
        setReplyModalOpen(true);
    };

    const submitAdminReply = async () => {
        if (!replyTarget || !replyContent.trim()) return;

        const parentId = `${replyTarget.created_at}-${replyTarget.nickname}`;
        setLoading(true);
        try {
            const adminKey = localStorage.getItem('admin_key') || '';
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: replyTarget.slug,
                    nickname: 'Admin',
                    content: replyContent,
                    parent_id: parentId,
                    adminPassword: adminKey
                }),
            });
            if (res.ok) {
                setMessage({ text: 'SUCCESS: REPLY_SENT', isError: false });
                setReplyModalOpen(false);
                setReplyTarget(null);
                setReplyContent('');
                fetchPosts();
            } else {
                setMessage({ text: 'ERROR: FAILED_TO_REPLY', isError: true });
            }
        } catch (error) {
            console.error('Reply error:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = (e: React.MouseEvent, filename: string) => {
        e.stopPropagation();
        setDeleteTargetId(deleteTargetId === filename ? null : filename);
    };

    const confirmDelete = async (targetType: AdminType, filename: string) => {
        setLoading(true);
        try {
            const adminKey = localStorage.getItem('admin_key') || '';
            const res = await fetch('/api/admin/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminKey
                },
                body: JSON.stringify({
                    type: targetType,
                    filename: filename
                })
            });

            if (res.ok) {
                setExistingPosts(prev => prev.filter(p => p.filename !== filename));
                setMessage({ text: 'SUCCESS: ITEM_DELETED', isError: false });
                setDeleteTargetId(null);
            } else {
                const err = await res.json() as { error?: string };
                setMessage({ text: `ERROR: ${err.error || 'Failed to delete'}`, isError: true });
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setLoading(false);
        }
    };


    if (checkingAuth) {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">Checking access...</div>;
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 selection:bg-white selection:text-black font-sans">
                <Card className="w-full max-w-[320px] border-neutral-800 bg-neutral-900/50 shadow-2xl">
                    <CardHeader className="space-y-1 text-center pb-2 pt-6">
                        <div className="flex justify-center mb-3">
                            <div className="h-8 w-8 rounded-full border border-neutral-800 flex items-center justify-center bg-neutral-950 shadow-inner">
                                <FiLock className="text-neutral-500 w-3 h-3" />
                            </div>
                        </div>
                        <CardTitle className="text-sm font-semibold tracking-tight text-white uppercase">Console Access</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 space-y-4">
                        <form onSubmit={handleLogin} className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="password" title="Security_Key" className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
                                    Security_Key
                                </Label>
                                <Input
                                    id="password"
                                    autoFocus
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={`bg-neutral-950 border-neutral-800 text-center tracking-[0.4em] focus:border-white/20 transition-all h-9 text-xs py-2 ${authError ? 'border-red-900/50' : ''}`}
                                />
                                {authError && (
                                    <p className="text-[9px] text-red-500 font-mono flex items-center justify-center gap-1 mt-1.5 uppercase tracking-tighter">
                                        <FiAlertTriangle className="w-2.5 h-2.5" />
                                        Access Denied
                                    </p>
                                )}
                            </div>
                            <Button
                                disabled={loading}
                                type="submit"
                                className="w-full bg-white text-black hover:bg-neutral-200 transition-colors font-mono text-[10px] tracking-widest h-9"
                            >
                                {loading ? '...' : 'ENTER'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t border-neutral-800/50 py-3">
                        <p className="text-[8px] text-neutral-600 font-mono uppercase tracking-[0.2em]">
                            Admin_V.2.1
                        </p>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-white selection:text-black overflow-hidden">
            <aside
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`${isSidebarCollapsed ? 'w-16' : 'w-60'} border-r border-neutral-900 bg-neutral-950 flex flex-col h-full transition-all duration-300 relative group cursor-pointer`}
            >
                <div className="p-4" onClick={(e) => e.stopPropagation()}>
                    <nav className="space-y-1">
                        {!isSidebarCollapsed && (
                            <Label className="text-[9px] text-neutral-600 uppercase tracking-widest px-2 font-mono mb-2 block animate-in fade-in duration-300">Content Type</Label>
                        )}
                        {(['dashboard', 'post', 'daily', 'moment', 'comment'] as const).map((t) => (

                            <button
                                key={t}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExistingPosts([]); // 立即清空，防止闪烁
                                    setType(t);
                                    setViewMode('list');
                                }}

                                className={`w-full flex items-center gap-3 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3'} py-2 rounded-md text-xs transition-all cursor-pointer ${type === t
                                    ? 'bg-neutral-900 text-white shadow-sm border border-neutral-800'
                                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50'
                                    }`}
                            >
                                <span className={`p-1 rounded text-[10px] shrink-0 ${type === t ? 'bg-neutral-950 text-white shadow-inner' : 'bg-transparent text-neutral-600'}`}>
                                    {t === 'dashboard' && <FiBarChart2 className="w-3 h-3" />}
                                    {t === 'post' && <FiEdit3 className="w-3 h-3" />}
                                    {t === 'daily' && <FiTerminal className="w-3 h-3" />}
                                    {t === 'moment' && <FiImage className="w-3 h-3" />}
                                    {t === 'comment' && <FiMessageSquare className="w-3 h-3" />}
                                </span>

                                {!isSidebarCollapsed && (
                                    <span className="font-medium capitalize tracking-wide truncate animate-in fade-in duration-300">{t}</span>
                                )}
                                {!isSidebarCollapsed && type === t && <FiCheck className="ml-auto w-3 h-3 text-neutral-500 shrink-0" />}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="mt-auto p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <Separator className="bg-neutral-900" />
                    <nav className="space-y-1">
                        <Link href="/" className={`flex items-center gap-3 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3'} py-2 text-xs text-neutral-500 hover:text-white transition-colors group rounded-md hover:bg-neutral-900/50 cursor-pointer`}>
                            <FiHome className="w-3.5 h-3.5 group-hover:scale-105 transition-transform shrink-0" />
                            {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">View Site</span>}
                        </Link>
                        <button
                            onClick={(e) => { e.stopPropagation(); localStorage.removeItem('admin_key'); window.location.reload(); }}
                            className={`w-full flex items-center gap-3 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3'} py-2 text-xs text-red-500/60 hover:text-red-500 transition-colors group rounded-md hover:bg-red-950/20 cursor-pointer`}
                        >
                            <FiLogOut className="w-3.5 h-3.5 shrink-0" />
                            {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Logout</span>}
                        </button>
                    </nav>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto bg-neutral-950 scroll-smooth">
                <div className="max-w-5xl mx-auto py-8 px-1">
                    <div className="mb-6 flex justify-between items-end border-b border-neutral-900 pb-4">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white mb-1 capitalize flex items-center gap-2">
                                {type === 'dashboard'
                                    ? 'Dashboard'
                                    : viewMode === 'list'
                                    ? `${type} Library`
                                    : (isEditing && type === 'post' ? 'Edit Post' : (type === 'comment' ? 'Comment Management' : `New ${type}`))}

                                <span className="text-neutral-600 font-normal text-sm">/</span>
                                <span className="text-neutral-500 font-mono text-xs uppercase normal-case tracking-wider font-normal">
                                    {type === 'dashboard'
                                        ? 'Overview'
                                        : (type === 'post' || type === 'daily' || type === 'moment') && viewMode === 'list' ? 'Library' : (type === 'comment' ? 'Library' : 'Editor')}
                                </span>

                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {type !== 'comment' && type !== 'dashboard' && (
                                <Button
                                    onClick={() => viewMode === 'edit' ? setViewMode('list') : handleNewItem()}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 font-mono text-[9px] uppercase tracking-widest px-3"
                                >
                                    {viewMode === 'edit' ? <FiList className="mr-2 w-3 h-3" /> : <FiPlus className="mr-2 w-3 h-3" />}
                                    {viewMode === 'edit' ? 'Library' : `New_${type}`}
                                </Button>
                            )}
                        </div>


                    </div>

                    <div className="bg-neutral-950">
                        {type === 'dashboard' ? (
                            <DashboardView data={dashboardData} loading={dashboardLoading} />
                        ) : viewMode === 'list' ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="grid grid-cols-1 gap-3">
                                    {listLoading ? (
                                        <div className="py-12 flex flex-col items-center gap-3 animate-pulse">
                                            <div className="h-4 w-48 bg-neutral-900 rounded" />
                                            <div className="h-3 w-32 bg-neutral-900 rounded" />
                                        </div>
                                    ) : existingPosts.length === 0 ? (
                                        <div className="py-12 text-center border border-dashed border-neutral-900 rounded-lg bg-neutral-900/20">
                                            <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">Empty_Registry</p>
                                        </div>
                                    ) : (

                                        existingPosts.map((post) => (
                                            <div
                                                key={post.filename}
                                                className="group flex items-center justify-between p-5 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
                                            >
                                                <div
                                                    className="flex-1 min-w-0 pr-6"
                                                    onClick={() => handleEditPost(post)}
                                                >
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <h3 className="text-sm font-bold text-neutral-200 truncate group-hover:text-white transition-colors">
                                                            {type === 'daily' ? post.date : (type === 'comment' ? post.content : post.title)}
                                                        </h3>
                                                        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 uppercase tracking-tighter shrink-0">{post.date || post.created_at}</span>
                                                        {type === 'comment' && (
                                                            <span className="text-[9px] font-mono text-green-500/60 bg-green-500/5 px-2 py-0.5 rounded border border-green-500/10 uppercase tracking-tighter shrink-0">
                                                                @{post.nickname} {post.contact && `(${post.contact})`}
                                                            </span>
                                                        )}
                                                        {type === 'comment' && post.articleTitle && (
                                                            <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter shrink-0 truncate max-w-[250px]">
                                                                FROM: {post.articleTitle}
                                                            </span>
                                                        )}


                                                    </div>
                                                    <p className="text-xs text-neutral-500 truncate font-mono">
                                                        {type === 'post' ? (post.description || '...') : (type === 'comment' ? '' : (post.content ? post.content.substring(0, 60) : '...'))}
                                                    </p>

                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {type === 'comment' && (
                                                        <button
                                                            onClick={(e) => handleReply(e, post)}
                                                            className="p-2 text-neutral-600 hover:text-blue-400 hover:bg-blue-950/30 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                            title="Reply"
                                                        >
                                                            <FiCornerUpLeft className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => handleDelete(e, post.filename)}
                                                            className={`p-2 rounded-md transition-all cursor-pointer ${deleteTargetId === post.filename ? 'text-red-500 bg-red-500/10' : 'text-neutral-600 hover:text-red-400 hover:bg-red-950/30 opacity-0 group-hover:opacity-100'}`}
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>

                                                        {/* Tactical Bubble Confirmation */}
                                                        {deleteTargetId === post.filename && (
                                                            <div
                                                                className="absolute right-0 bottom-full mb-2 z-10 p-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-1 duration-200 min-w-[140px]"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <p className="text-[10px] font-mono uppercase tracking-tighter text-neutral-400 mb-2 px-1">Confirm_Purge?</p>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => setDeleteTargetId(null)}
                                                                        className="flex-1 py-1 text-[9px] font-mono uppercase bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded transition-colors"
                                                                    >
                                                                        No
                                                                    </button>
                                                                    <button
                                                                        onClick={() => confirmDelete(type, post.filename)}
                                                                        className="flex-1 py-1 text-[9px] font-mono uppercase bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded transition-colors border border-red-900/50"
                                                                    >
                                                                        Yes
                                                                    </button>
                                                                </div>
                                                                <div className="absolute top-full right-3 w-2 h-2 bg-neutral-900 border-r border-b border-neutral-800 rotate-45 -translate-y-1" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div
                                                        className="p-2 text-neutral-600 hover:text-white transition-colors"
                                                        onClick={() => handleEditPost(post)}
                                                    >
                                                        <FiChevronRight className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {type === 'post' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {isEditing && (
                                            <div className="bg-blue-900/10 border border-blue-900/20 rounded-md px-3 py-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FiEdit3 className="text-blue-500 w-3 h-3" />
                                                    <p className="text-[10px] uppercase tracking-wider text-blue-400 font-mono">Editing: <span className="text-white">{currentFilename}</span></p>
                                                </div>
                                                <Button type="button" onClick={handleNewPost} variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-mono tracking-wider text-blue-400/60 hover:text-blue-300 p-0 hover:bg-transparent">
                                                    Close
                                                </Button>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="post-title" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Title</Label>
                                                <Input id="post-title" placeholder="New Entry..." value={postData.title} onChange={(e) => setPostData({ ...postData, title: e.target.value })} className="bg-neutral-900/50 border-neutral-800 h-9 text-xs focus:bg-neutral-900 text-white placeholder:text-neutral-700" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="post-date" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Date</Label>
                                                <Input id="post-date" type="date" value={postData.date} onChange={(e) => { const val = e.target.value; setPostData(prev => ({ ...prev, date: val, slug: isSlugModified ? prev.slug : dateToSlug(val) })); }} className="bg-neutral-900/50 border-neutral-800 h-9 text-xs focus:bg-neutral-900 text-white [&::-webkit-calendar-picker-indicator]:invert" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="post-desc" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Description</Label>
                                            <Input id="post-desc" value={postData.description} onChange={(e) => setPostData({ ...postData, description: e.target.value })} className="bg-neutral-900/50 border-neutral-800 h-9 text-xs focus:bg-neutral-900 text-neutral-300" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="post-slug" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Slug</Label>
                                                <Input id="post-slug" value={postData.slug} onChange={(e) => { setPostData({ ...postData, slug: e.target.value }); setIsSlugModified(true); }} className="bg-neutral-900/50 border-neutral-800 h-9 text-xs font-mono text-neutral-400 focus:bg-neutral-900" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="post-category" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Category</Label>
                                                <Input id="post-category" value={postData.category} onChange={(e) => setPostData({ ...postData, category: e.target.value })} className="bg-neutral-900/50 border-neutral-800 h-9 text-xs focus:bg-neutral-900 text-neutral-300" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="post-content" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Content</Label>
                                            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                                                <div className="flex flex-wrap items-center gap-1 border-b border-neutral-900 bg-neutral-900/40 p-2">
                                                    <button type="button" onClick={() => insertPostMarkdown('**', '**', 'bold text')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] font-bold text-neutral-300 hover:border-neutral-600 hover:text-white">B</button>
                                                    <button type="button" onClick={() => insertPostMarkdown('*', '*', 'italic text')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] italic text-neutral-300 hover:border-neutral-600 hover:text-white">I</button>
                                                    <button type="button" onClick={() => insertPostMarkdown('## ', '', 'Heading')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white">H2</button>
                                                    <button type="button" onClick={() => insertPostMarkdown('### ', '', 'Subheading')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white">H3</button>
                                                    <span className="mx-1 h-5 w-px bg-neutral-800" />
                                                    <button type="button" onClick={() => insertPostMarkdown('> ', '', '引用 / 摘录')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white">QUOTE</button>
                                                    <button type="button" onClick={() => insertPostMarkdown('[', '](https://)', 'link text')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white">LINK</button>
                                                    <button type="button" onClick={() => insertPostMarkdown('![', '](https://)', 'image alt')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white">IMG</button>
                                                    <button type="button" onClick={() => insertPostMarkdown('`', '`', 'code')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white">CODE</button>
                                                    <button type="button" onClick={() => insertPostMarkdown('- ', '', 'list item')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white">LIST</button>
                                                    <button type="button" onClick={() => insertPostMarkdown('```\n', '\n```', 'code block')} className="h-7 rounded-md border border-neutral-800 px-2 font-mono text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white">BLOCK</button>
                                                    <span className="ml-auto hidden font-mono text-[9px] uppercase tracking-widest text-neutral-600 md:inline">Source / Preview</span>
                                                </div>
                                                <div className="grid grid-cols-1 lg:grid-cols-2">
                                                    <div className="border-b border-neutral-900 lg:border-b-0 lg:border-r">
                                                        <div className="border-b border-neutral-900 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-600">Markdown_Source</div>
                                                        <textarea
                                                            ref={postContentRef}
                                                            id="post-content"
                                                            rows={25}
                                                            value={postData.content}
                                                            onChange={(e) => updatePostContent(e.target.value)}
                                                            className="flex min-h-[560px] w-full resize-y border-0 bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-300 outline-none transition-colors placeholder:text-neutral-700 focus:bg-neutral-900/40"
                                                        />
                                                    </div>
                                                    <div className="min-h-[560px] bg-[#111]">
                                                        <div className="border-b border-neutral-900 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-600">Rendered_Preview</div>
                                                        <div
                                                            className="prose prose-invert max-w-none p-5 text-sm"
                                                            dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(postData.content) }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {type === 'daily' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="daily-date" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Date</Label>
                                            <Input id="daily-date" type="date" className="max-w-[150px] bg-neutral-900/50 border-neutral-800 h-9 text-xs text-white [&::-webkit-calendar-picker-indicator]:invert" value={dailyData.date} onChange={(e) => setDailyData({ ...dailyData, date: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="daily-url" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Image URL (Optional)</Label>
                                            <Input id="daily-url" value={dailyData.imageUrl} onChange={(e) => setDailyData({ ...dailyData, imageUrl: e.target.value })} className="bg-neutral-900/50 border-neutral-800 h-9 font-mono text-[10px] text-neutral-400 focus:bg-neutral-900" placeholder="https://..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="daily-content" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Log</Label>
                                            <Textarea id="daily-content" rows={10} value={dailyData.content} onChange={(e) => setDailyData({ ...dailyData, content: e.target.value })} className="bg-neutral-900/50 border-neutral-800 min-h-[200px] resize-none leading-normal p-4 text-xs font-mono text-neutral-300 focus:bg-neutral-900" />
                                        </div>
                                    </div>
                                )}

                                {type === 'moment' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="moment-title" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Title</Label>
                                                <Input id="moment-title" value={momentData.title} onChange={(e) => setMomentData({ ...momentData, title: e.target.value })} className="bg-neutral-900/50 border-neutral-800 h-9 text-xs focus:bg-neutral-900 text-white" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="moment-date" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Date</Label>
                                                <Input id="moment-date" type="date" value={momentData.date} onChange={(e) => setMomentData({ ...momentData, date: e.target.value })} className="bg-neutral-900/50 border-neutral-800 h-9 text-xs focus:bg-neutral-900 text-white [&::-webkit-calendar-picker-indicator]:invert" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="moment-url" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Image URL</Label>
                                            <Input id="moment-url" value={momentData.imageUrl} onChange={(e) => setMomentData({ ...momentData, imageUrl: e.target.value })} className="bg-neutral-900/50 border-neutral-800 h-9 font-mono text-[10px] text-neutral-400 focus:bg-neutral-900" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="moment-content" className="text-[10px] text-neutral-500 font-semibold px-0.5 uppercase tracking-wider">Caption</Label>
                                            <Textarea id="moment-content" rows={4} value={momentData.content} onChange={(e) => setMomentData({ ...momentData, content: e.target.value })} className="bg-neutral-900/50 border-neutral-800 min-h-[100px] resize-none leading-normal p-3 text-xs focus:bg-neutral-900 text-neutral-300" />
                                        </div>
                                    </div>
                                )}

                                {message && (
                                    <div className={`p-3 rounded-md text-[10px] font-mono leading-tight border transition-all duration-300 ${message.isError ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`h-1.5 w-1.5 rounded-full ${message.isError ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                                            {message.text}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-neutral-900">
                                    <Button disabled={loading} type="submit" size="sm" className="w-full md:w-auto min-w-[120px] bg-white text-black hover:bg-neutral-200 transition-all font-bold tracking-widest text-[10px] h-9 shadow-lg shadow-white/5 active:scale-95 cursor-pointer">
                                        {loading ? (
                                            <div className="flex items-center gap-2 italic">
                                                <div className="animate-spin h-2.5 w-2.5 border-2 border-current border-t-transparent rounded-full" />
                                                SAVING...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <FiSave className="w-3.5 h-3.5" />
                                                {isEditing ? 'UPDATE' : 'PUBLISH'}
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>
            {/* Reply Dialog */}
            {replyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                            <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400">Reply_Channel: [Admin]</h3>
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-neutral-950 p-3 rounded border border-neutral-800/50">
                                <p className="text-[10px] text-neutral-600 font-mono uppercase mb-1">Target_Signal:</p>
                                <p className="text-xs text-neutral-400 italic">@{replyTarget?.nickname}: {replyTarget?.content}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reply-content" className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Input_Message</Label>
                                <Textarea
                                    id="reply-content"
                                    autoFocus
                                    className="min-h-[120px] bg-neutral-950 border-neutral-800 text-xs font-mono text-neutral-300 focus:border-blue-500/50 resize-none"
                                    placeholder="Enter response signals..."
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyModalOpen(false)}
                                className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest hover:text-white"
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={loading || !replyContent.trim()}
                                size="sm"
                                onClick={submitAdminReply}
                                className="bg-white text-black hover:bg-neutral-200 text-[10px] font-mono uppercase tracking-widest px-6"
                            >
                                {loading ? 'Sending...' : 'Transmit_Signal'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog 已经移除，改为气泡式 */}

        </div>
    );
}
