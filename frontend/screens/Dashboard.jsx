import React, { useState, useEffect } from "react";
import { Chart } from "chart.js/auto";

export default function Dashboard({ user, appType, onNavigateToHistory }) {
    const [config, setConfig] = useState({});
    const [timeRange, setTimeRange] = useState('LAST_7_DAYS');
    const [summary, setSummary] = useState({ total_bills: 0, total_sales: 0, avg_bill: 0 });
    const [salesTrend, setSalesTrend] = useState([]);
    const [topItems, setTopItems] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [stockAlerts, setStockAlerts] = useState([]);
    const [expiryAlerts, setExpiryAlerts] = useState({ critical: [], urgent: [], upcoming: [] });
    const [loading, setLoading] = useState(true);

    // Chart instances
    const [salesChart, setSalesChart] = useState(null);
    const [topItemsChart, setTopItemsChart] = useState(null);
    const [paymentChart, setPaymentChart] = useState(null);

    // Load dashboard config
    useEffect(() => {
        fetch("http://localhost:4000/api/dashboard-config")
            .then(r => r.json())
            .then(data => {
                setConfig(data);
                if (data.default_time_range) setTimeRange(data.default_time_range);
            });
    }, []);

    // Load dashboard data
    useEffect(() => {
        loadDashboardData();
    }, [timeRange, config]);

    function loadDashboardData() {
        setLoading(true);
        setSalesTrend([]);
        setTopItems([]);
        setPaymentMethods([]);

        const promises = [];

        // Load summary
        promises.push(
            fetch(`http://localhost:4000/api/dashboard/summary?range=${timeRange}`)
                .then(r => r.json())
                .then(data => setSummary(data))
        );

        // Load sales trend
        if (config.show_sales_trend !== 0) {
            promises.push(
                fetch(`http://localhost:4000/api/dashboard/sales-trend?range=${timeRange}`)
                    .then(r => r.json())
                    .then(data => setSalesTrend(data))
            );
        }

        // Load top items
        if (config.show_top_items !== 0) {
            promises.push(
                fetch(`http://localhost:4000/api/dashboard/top-items?range=${timeRange}&limit=10`)
                    .then(r => r.json())
                    .then(data => setTopItems(data))
            );
        }

        // Load payment methods
        if (config.show_payment_methods !== 0) {
            promises.push(
                fetch(`http://localhost:4000/api/dashboard/payment-methods?range=${timeRange}`)
                    .then(r => r.json())
                    .then(data => setPaymentMethods(data))
            );
        }

        // Load stock alerts
        if (config.show_stock_alerts !== 0) {
            promises.push(
                fetch("http://localhost:4000/api/dashboard/stock-alerts")
                    .then(r => r.json())
                    .then(data => setStockAlerts(data))
            );
        }

        // Load expiry alerts
        promises.push(
            fetch("http://localhost:4000/api/dashboard/expiry-alerts")
                .then(r => r.json())
                .then(data => setExpiryAlerts(data))
        );

        // Wait for all promises to resolve before setting loading to false
        Promise.all(promises)
            .then(() => setLoading(false))
            .catch(err => {
                console.error('Dashboard data loading error:', err);
                setLoading(false);
            });
    }

    // Render Sales Trend Chart
    useEffect(() => {
        if (!config.show_sales_trend || salesTrend.length === 0) return;

        const ctx = document.getElementById('salesTrendChart');
        if (!ctx) return;

        if (salesChart) salesChart.destroy();

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: salesTrend.map(d => d.date),
                datasets: [{
                    label: 'Sales (₹)',
                    data: salesTrend.map(d => d.total || 0),
                    borderColor: '#34C759',
                    backgroundColor: 'rgba(52, 199, 89, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        setSalesChart(chart);

        return () => chart.destroy();
    }, [salesTrend, config.show_sales_trend, loading]);



    // Render Top Items Chart
    useEffect(() => {
        if (!config.show_top_items || topItems.length === 0) return;

        const ctx = document.getElementById('topItemsChart');
        if (!ctx) return;

        if (topItemsChart) topItemsChart.destroy();

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topItems.map(d => d.item_name),
                datasets: [{
                    label: 'Quantity Sold',
                    data: topItems.map(d => d.total_qty || 0),
                    backgroundColor: '#007AFF'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });

        setTopItemsChart(chart);

        return () => chart.destroy();
    }, [topItems, config.show_top_items, loading]);

    // Render Payment Methods Chart
    useEffect(() => {
        if (!config.show_payment_methods || paymentMethods.length === 0) return;

        const ctx = document.getElementById('paymentChart');
        if (!ctx) return;

        if (paymentChart) paymentChart.destroy();

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: paymentMethods.map(d => d.payment_method || 'CASH'),
                datasets: [{
                    data: paymentMethods.map(d => d.count || 0),
                    backgroundColor: ['#34C759', '#FF9500', '#AF52DE', '#FF2D55']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const label = paymentMethods[index].payment_method;
                        if (onNavigateToHistory) {
                            onNavigateToHistory(label, timeRange);
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${value} bills`;
                            }
                        }
                    }
                }
            }
        });

        setPaymentChart(chart);

        return () => chart.destroy();
    }, [paymentMethods, config.show_payment_methods, loading]);

    const timeRangeOptions = [
        { value: 'TODAY', label: 'Today' },
        { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
        { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
        { value: 'LAST_3_MONTHS', label: 'Last 3 Months' }
    ];

    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return (
            <div className="flex justify-center items-center" style={{ height: '60vh' }}>
                <div className="glass-card" style={{ width: 400, textAlign: 'center' }}>
                    <h2>🔒 Access Denied</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Only ADMIN and SUPER_ADMIN can access the dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 style={{ margin: 0 }}>📊 Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '5px 0 0 0' }}>
                        {appType === 'RESTAURANT' ? 'Restaurant' : 'Retail'} Analytics & Insights
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.3)',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        {timeRangeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="dashboard-grid cards-summary">
                <div className="glass-card summary-card">
                    <div className="label">Total Sales</div>
                    <div className="value sales">₹{summary.total_sales?.toFixed(2) || '0.00'}</div>
                </div>

                <div className="glass-card summary-card">
                    <div className="label">Total Bills</div>
                    <div className="value bills">{summary.total_bills || 0}</div>
                </div>

                <div className="glass-card summary-card">
                    <div className="label">Avg Bill Value</div>
                    <div className="value avg">₹{summary.avg_bill?.toFixed(2) || '0.00'}</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="dashboard-grid charts-container">
                {config.show_sales_trend === 1 && (
                    <div className="glass-card chart-card">
                        <h3>📈 Sales Trend</h3>
                        <div className="chart-wrapper">
                            {loading ? (
                                <div className="loader">Loading...</div>
                            ) : salesTrend.length === 0 ? (
                                <div className="empty-state">No sales data for this period</div>
                            ) : (
                                <canvas id="salesTrendChart"></canvas>
                            )}
                        </div>
                    </div>
                )}

                {config.show_top_items === 1 && (
                    <div className="glass-card chart-card">
                        <h3>🏆 Top Selling Items</h3>
                        <div className="chart-wrapper">
                            {loading ? (
                                <div className="loader">Loading...</div>
                            ) : topItems.length === 0 ? (
                                <div className="empty-state">No items sold in this period</div>
                            ) : (
                                <canvas id="topItemsChart"></canvas>
                            )}
                        </div>
                    </div>
                )}

                {config.show_payment_methods === 1 && (
                    <div className="glass-card chart-card">
                        <h3>💳 Payment Methods</h3>
                        <div className="chart-wrapper">
                            {loading ? (
                                <div className="loader">Loading...</div>
                            ) : paymentMethods.length === 0 ? (
                                <div className="empty-state">No payment data for this period</div>
                            ) : (
                                <canvas id="paymentChart"></canvas>
                            )}
                        </div>
                    </div>
                )}

                {config.show_stock_alerts === 1 && (
                    <div className="glass-card chart-card">
                        <h3>⚠️ Low Stock Alerts</h3>
                        <div className="stock-alerts-list">
                            {loading ? (
                                <div className="loader" style={{ height: 200 }}>Loading...</div>
                            ) : stockAlerts.length === 0 ? (
                                <div className="empty-state" style={{ height: 200 }}>All items are well stocked! ✅</div>
                            ) : (
                                <table className="stock-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th className="text-center">Stock</th>
                                            <th className="text-right">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockAlerts.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.name}</td>
                                                <td className="text-center">
                                                    <span className={`stock-badge ${item.stock < 5 ? 'critical' : 'warning'}`}>
                                                        {item.stock}
                                                    </span>
                                                </td>
                                                <td className="text-right category">
                                                    {item.category || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Expiry Alerts Section */}
            <h2 style={{ marginTop: 40, marginBottom: 20 }}>⏳ Expiry Alerts</h2>
            <div className="dashboard-grid cards-summary">

                {/* Critical (7 Days) */}
                <div className="glass-card expiry-card critical">
                    <div className="header">
                        <h3>Critical (7 Days)</h3>
                        <span className="count">{expiryAlerts.critical?.length || 0}</span>
                    </div>
                    {expiryAlerts.critical?.length > 0 ? (
                        <ul className="expiry-list">
                            {expiryAlerts.critical.map(i => (
                                <li key={i.id}>
                                    <span>{i.name}</span>
                                    <span className="date">{new Date(i.expiry_date).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <div className="empty-msg">No critical items ✅</div>}
                </div>

                {/* Urgent (30 Days) */}
                <div className="glass-card expiry-card urgent">
                    <div className="header">
                        <h3>Urgent (30 Days)</h3>
                        <span className="count">{expiryAlerts.urgent?.length || 0}</span>
                    </div>
                    {expiryAlerts.urgent?.length > 0 ? (
                        <ul className="expiry-list">
                            {expiryAlerts.urgent.map(i => (
                                <li key={i.id}>
                                    <span>{i.name}</span>
                                    <span className="date">{new Date(i.expiry_date).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <div className="empty-msg">No urgent items</div>}
                </div>

                {/* Upcoming (60 Days) */}
                <div className="glass-card expiry-card upcoming">
                    <div className="header">
                        <h3>Upcoming (60 Days)</h3>
                        <span className="count">{expiryAlerts.upcoming?.length || 0}</span>
                    </div>
                    {expiryAlerts.upcoming?.length > 0 ? (
                        <ul className="expiry-list">
                            {expiryAlerts.upcoming.map(i => (
                                <li key={i.id}>
                                    <span>{i.name}</span>
                                    <span className="date">{new Date(i.expiry_date).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <div className="empty-msg">No upcoming items</div>}
                </div>
            </div>

            <style>{`
        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding-bottom: 40px;
        }
        .dashboard-grid {
          display: grid;
          gap: 20px;
        }
        .cards-summary {
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          margin-bottom: 30px;
        }
        .charts-container {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 450px), 1fr));
        }
        
        /* Ensure layout doesn't look weird with 1 chart */
        .charts-container > .chart-card {
            min-height: 380px;
            display: flex;
            flex-direction: column;
        }

        .summary-card { text-align: center; padding: 24px; }
        .summary-card .label { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
        .summary-card .value { font-size: 32px; font-weight: bold; }
        .summary-card .value.sales { color: #34C759; }
        .summary-card .value.bills { color: #007AFF; }
        .summary-card .value.avg { color: #FF9500; }

        .chart-card h3 { margin-top: 0; margin-bottom: 20px; font-size: 18px; }
        .chart-wrapper { flex: 1; position: relative; min-height: 300px; }
        
        .loader, .empty-state {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: var(--text-secondary);
        }

        .stock-alerts-list { max-height: 350px; overflow-y: auto; }
        .stock-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .stock-table th { text-align: left; padding: 12px 8px; border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); font-weight: 500; }
        .stock-table td { padding: 12px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .stock-table .text-center { text-align: center; }
        .stock-table .text-right { text-align: right; }
        .stock-table .category { color: var(--text-secondary); }
        
        .stock-badge {
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
        }
        .stock-badge.critical { background: rgba(255,59,48,0.15); color: #FF3B30; }
        .stock-badge.warning { background: rgba(255,149,0,0.15); color: #FF9500; }

        @media (max-width: 768px) {
            .cards-summary { grid-template-columns: 1fr; }
            .charts-container { grid-template-columns: 1fr; }
            .summary-card .value { font-size: 24px; }
        }

        .expiry-card {
            min-height: 250px;
            display: flex;
            flex-direction: column;
        }
        .expiry-card .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .expiry-card h3 { margin: 0; font-size: 16px; }
        .expiry-card .count {
            background: rgba(255,255,255,0.1);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .expiry-card.critical h3 { color: #FF3B30; }
        .expiry-card.critical .count { background: rgba(255,59,48,0.2); color: #FF3B30; }
        
        .expiry-card.urgent h3 { color: #FF9500; }
        .expiry-card.urgent .count { background: rgba(255,149,0,0.2); color: #FF9500; }

        .expiry-card.upcoming h3 { color: #FFD60A; }
        .expiry-card.upcoming .count { background: rgba(255,214,10,0.2); color: #FFD60A; }

        .expiry-list {
            list-style: none;
            padding: 0;
            margin: 0;
            flex: 1;
            overflow-y: auto;
            max-height: 200px;
        }
        .expiry-list li {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-size: 13px;
        }
        .expiry-list .date { color: var(--text-secondary); font-size: 12px; }
        .empty-msg {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            font-size: 13px;
            font-style: italic;
        }
      `}</style>
        </div>
    );
}
