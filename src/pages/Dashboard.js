import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import '../components/StatCard.css';

function formatCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function firstDayOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonthStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [activeDetail, setActiveDetail] = useState('sales');
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailType, setDetailType] = useState(''); // 'sale' or 'order'

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/dashboard', {
        params: { startDate, endDate },
      });
      setStats(res.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of sales and orders for Janani Home Food Store</p>
      </div>

      {/* Date Range Filter */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
            📅 Date Range
          </span>
          <input
            id="dash-start"
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            id="dash-end"
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button className="btn btn-primary" onClick={fetchStats} disabled={loading}>
            {loading ? 'Loading…' : 'Apply'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setStartDate(todayStr()); setEndDate(todayStr()); }}
          >
            Today
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">⚠ {error}</div>}

      {loading && (
        <div className="spinner-container">
          <div className="spinner" />
        </div>
      )}

      {!loading && stats && (
        <>
          <div className="stats-grid">
            <div
              onClick={() => setActiveDetail('sales')}
              style={{
                cursor: 'pointer',
                borderRadius: 'var(--radius-lg)',
                boxShadow: activeDetail === 'sales' ? '0 0 0 2px var(--success)' : 'none',
                transition: 'box-shadow 0.2s'
              }}
            >
              <StatCard
                icon="💰"
                label="Total Sales"
                value={formatCurrency(stats.totalSales)}
                sub={`${stats.salesCount} transaction${stats.salesCount !== 1 ? 's' : ''}`}
                accent="green"
              />
            </div>
            <div
              onClick={() => setActiveDetail('orders')}
              style={{
                cursor: 'pointer',
                borderRadius: 'var(--radius-lg)',
                boxShadow: activeDetail === 'orders' ? '0 0 0 2px var(--accent)' : 'none',
                transition: 'box-shadow 0.2s'
              }}
            >
              <StatCard
                icon="📦"
                label="Advance Payments"
                value={formatCurrency(stats.totalAdvance)}
                sub={`${stats.ordersCount} order${stats.ordersCount !== 1 ? 's' : ''} placed`}
                accent="cyan"
              />
            </div>
            <div
              onClick={() => setActiveDetail('pending')}
              style={{
                cursor: 'pointer',
                borderRadius: 'var(--radius-lg)',
                boxShadow: activeDetail === 'pending' ? '0 0 0 2px var(--warning)' : 'none',
                transition: 'box-shadow 0.2s'
              }}
            >
              <StatCard
                icon="🕐"
                label="Pending Orders"
                value={stats.pendingCount}
                sub="Awaiting completion"
                accent="amber"
              />
            </div>
            <div
              onClick={() => setActiveDetail('revenue')}
              style={{
                cursor: 'pointer',
                borderRadius: 'var(--radius-lg)',
                boxShadow: activeDetail === 'revenue' ? '0 0 0 2px var(--primary)' : 'none',
                transition: 'box-shadow 0.2s'
              }}
            >
              <StatCard
                icon="🏪"
                label="Total Revenue"
                value={formatCurrency((stats.totalSales || 0) + (stats.totalAdvance || 0))}
                sub="Sales + Advances"
                accent="purple"
              />
            </div>
          </div>

          {/* Quick info */}
          <div className="glass-card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              Quick Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {[
                { label: 'Sales Transactions', value: stats.salesCount },
                { label: 'Orders Created', value: stats.ordersCount },
                { label: 'Pending Orders', value: stats.pendingCount },
                { label: 'Avg Sale Amount', value: stats.salesCount > 0 ? formatCurrency(stats.totalSales / stats.salesCount) : '₹0' },
              ].map((item) => (
                <div key={item.label} style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed table view */}
          {activeDetail && (
            <div className="glass-card" style={{ animation: 'fade-in 0.25s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeDetail === 'sales' && 'Sales Details'}
                  {activeDetail === 'orders' && 'Advance Order Details'}
                  {activeDetail === 'pending' && 'All Pending Orders'}
                  {activeDetail === 'revenue' && 'Revenue Transactions'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click another stat card to change this view
                </span>
              </div>

              {activeDetail === 'sales' && (
                stats.sales.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-icon">🧾</div>
                    <p>No sales recorded in this date range.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Item / Description</th>
                          <th>Amount</th>
                          <th>Payment Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.sales.map((s) => (
                          <tr key={s._id} onClick={() => { setSelectedItem(s); setDetailType('sale'); }} style={{ cursor: 'pointer' }} title="Click to view details">
                            <td data-label="Date" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(s.date).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              })}
                            </td>
                            <td data-label="Item" style={{ fontWeight: 600 }}>{s.itemName}</td>
                            <td data-label="Amount" style={{ fontWeight: 700, color: '#4ade80' }}>
                              {formatCurrency(s.amount)}
                            </td>
                            <td data-label="Mode">
                              <span className={`badge badge-${s.paymentMode}`}>
                                {s.paymentMode === 'cash' ? '💵' : s.paymentMode === 'upi' ? '📱' : '💳'}
                                {s.paymentMode.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {activeDetail === 'orders' && (
                stats.orders.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-icon">📦</div>
                    <p>No orders created in this date range.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Item</th>
                          <th>Total</th>
                          <th>Advance</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.orders.map((o) => (
                          <tr key={o._id} onClick={() => { setSelectedItem(o); setDetailType('order'); }} style={{ cursor: 'pointer' }} title="Click to view details">
                            <td data-label="Date" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(o.date).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              })}
                            </td>
                            <td data-label="Customer" style={{ fontWeight: 600 }}>{o.customerName}</td>
                            <td data-label="Item" style={{ color: 'var(--text-secondary)' }}>{o.itemName}</td>
                            <td data-label="Total" style={{ fontWeight: 700 }}>{formatCurrency(o.totalAmount)}</td>
                            <td data-label="Advance" style={{ color: '#4ade80', fontWeight: 600 }}>{formatCurrency(o.advancePaid)}</td>
                            <td data-label="Balance" style={{ color: o.balance > 0 ? '#fcd34d' : '#4ade80', fontWeight: 700 }}>
                              {formatCurrency(o.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {activeDetail === 'pending' && (
                stats.pendingOrders.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-icon">🕐</div>
                    <p>No pending orders.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Item</th>
                          <th>Total</th>
                          <th>Advance</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.pendingOrders.map((o) => (
                          <tr key={o._id} onClick={() => { setSelectedItem(o); setDetailType('order'); }} style={{ cursor: 'pointer' }} title="Click to view details">
                            <td data-label="Date" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(o.date).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              })}
                            </td>
                            <td data-label="Customer" style={{ fontWeight: 600 }}>{o.customerName}</td>
                            <td data-label="Item" style={{ color: 'var(--text-secondary)' }}>{o.itemName}</td>
                            <td data-label="Total" style={{ fontWeight: 700 }}>{formatCurrency(o.totalAmount)}</td>
                            <td data-label="Advance" style={{ color: '#4ade80', fontWeight: 600 }}>{formatCurrency(o.advancePaid)}</td>
                            <td data-label="Balance" style={{ color: o.balance > 0 ? '#fcd34d' : '#4ade80', fontWeight: 700 }}>
                              {formatCurrency(o.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {activeDetail === 'revenue' && (
                (stats.sales.length === 0 && stats.orders.length === 0) ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-icon">🏪</div>
                    <p>No revenue transactions in this date range.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Details</th>
                          <th>Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...stats.sales.map(s => ({ ...s, type: 'Sale', desc: s.itemName, received: s.amount, rawItem: s, rawType: 'sale' })),
                          ...stats.orders.map(o => ({ ...o, type: 'Order Advance', desc: `${o.customerName} - ${o.itemName}`, received: o.advancePaid, rawItem: o, rawType: 'order' }))
                        ].sort((a, b) => new Date(b.date) - new Date(a.date)).map((item, idx) => (
                          <tr key={idx} onClick={() => { setSelectedItem(item.rawItem); setDetailType(item.rawType); }} style={{ cursor: 'pointer' }} title="Click to view details">
                            <td data-label="Date" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(item.date).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              })}
                            </td>
                            <td data-label="Type" style={{ fontWeight: 700, color: item.type === 'Sale' ? '#4ade80' : '#22d3ee' }}>
                              {item.type}
                            </td>
                            <td data-label="Details">{item.desc}</td>
                            <td data-label="Received" style={{ fontWeight: 700, color: '#4ade80' }}>
                              {formatCurrency(item.received)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          {/* Details Modal */}
          <Modal
            isOpen={selectedItem !== null}
            onClose={() => setSelectedItem(null)}
            title={detailType === 'sale' ? 'Sale Details' : 'Order Details'}
          >
            {selectedItem && (
              <div style={{ padding: '8px 0' }}>
                {detailType === 'sale' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {new Date(selectedItem.date).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Item Description</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedItem.itemName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Amount Paid</span>
                      <span style={{ fontWeight: 800, color: '#4ade80', fontSize: '1.2rem' }}>{formatCurrency(selectedItem.amount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Payment Mode</span>
                      <span className={`badge badge-${selectedItem.paymentMode}`}>
                        {selectedItem.paymentMode === 'cash' ? '💵 ' : selectedItem.paymentMode === 'upi' ? '📱 ' : '💳 '}
                        {selectedItem.paymentMode.toUpperCase()}
                      </span>
                    </div>
                    {selectedItem.paymentMode === 'cash' && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Cash Received</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(selectedItem.cashReceived || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Change Returned</span>
                          <span style={{ fontWeight: 800, color: (selectedItem.changeReturned || 0) < 0 ? '#ef4444' : '#4ade80' }}>
                            {formatCurrency(selectedItem.changeReturned || 0)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Order Date & Time</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {new Date(selectedItem.date).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Customer Name</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedItem.customerName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Item Description</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedItem.itemName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Amount</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(selectedItem.totalAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Advance Paid</span>
                      <span style={{ fontWeight: 700, color: '#4ade80' }}>{formatCurrency(selectedItem.advancePaid)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Remaining Balance</span>
                      <span style={{ fontWeight: 800, color: selectedItem.balance > 0 ? '#fcd34d' : '#4ade80', fontSize: '1.2rem' }}>{formatCurrency(selectedItem.balance)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Advance Mode</span>
                      <span className={`badge badge-${selectedItem.advancePaymentMode}`}>
                        {selectedItem.advancePaymentMode === 'cash' ? '💵 ' : selectedItem.advancePaymentMode === 'upi' ? '📱 ' : '💳 '}
                        {selectedItem.advancePaymentMode.toUpperCase()}
                      </span>
                    </div>
                    {selectedItem.advancePaymentMode === 'cash' && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Cash Received</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(selectedItem.cashReceived || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Change Returned</span>
                          <span style={{ fontWeight: 800, color: (selectedItem.changeReturned || 0) < 0 ? '#ef4444' : '#4ade80' }}>
                            {formatCurrency(selectedItem.changeReturned || 0)}
                          </span>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
                      <span className={`badge badge-${selectedItem.status}`}>
                        {selectedItem.status === 'pending' ? '🕐 ' : '✅ '}
                        {selectedItem.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
                <div className="form-actions" style={{ marginTop: 20 }}>
                  <button className="btn btn-ghost" onClick={() => setSelectedItem(null)}>Close</button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}

export default Dashboard;
