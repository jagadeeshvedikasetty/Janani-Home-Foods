import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const PAYMENT_MODES = ['cash', 'upi', 'card'];
const STATUSES = ['pending', 'completed'];

function toLocalDatetimeString(d = new Date()) {
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  date.setMinutes(date.getMinutes() - offset);
  return date.toISOString().slice(0, 16);
}

const EMPTY_FORM = {
  customerName: '',
  itemName: '',
  quantity: '',
  unit: 'kg',
  totalAmount: '',
  advancePaid: '',
  advancePaymentMode: 'cash',
  status: 'pending',
  date: toLocalDatetimeString(),
};

function formatCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cashReceived, setCashReceived] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const resOrders = await api.get('/api/orders', { params });
      setOrders(resOrders.data);
      
      const resProducts = await api.get('/api/products');
      setProducts(resProducts.data);
    } catch {
      setError('Failed to load orders or products.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setCashReceived('');
    setFormError('');
    setModalOpen(true);
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate if product, quantity, or unit changes
      if (name === 'itemName' || name === 'quantity' || name === 'unit') {
        const itemName = name === 'itemName' ? value : updated.itemName;
        const prod = products.find(p => p.name === itemName);
        
        if (name === 'itemName' && prod) {
           updated.unit = prod.unit === 'kg' ? 'kg' : prod.unit;
        }

        const qty = Number(updated.quantity) || 0;
        
        if (prod) {
          updated.totalAmount = (prod.price * qty).toFixed(2);
        } else {
          updated.totalAmount = '';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.customerName.trim()) return setFormError('Customer name is required.');
    if (!form.itemName.trim()) return setFormError('Item name is required.');
    if (!form.totalAmount || Number(form.totalAmount) < 0) return setFormError('Valid total amount required.');
    if (form.advancePaid === '' || Number(form.advancePaid) < 0) return setFormError('Valid advance amount required.');
    if (Number(form.advancePaid) > Number(form.totalAmount)) return setFormError('Advance cannot exceed total amount.');

    setSaving(true);
    try {
      const payload = {
        ...form,
        date: new Date(form.date).toISOString(),
        quantity: Number(form.quantity) || 1,
        unit: form.unit || 'kg',
        totalAmount: Number(form.totalAmount),
        advancePaid: Number(form.advancePaid),
        cashReceived: form.advancePaymentMode === 'cash' ? Number(cashReceived || 0) : 0,
        changeReturned: form.advancePaymentMode === 'cash' ? Number(cashReceived || 0) - Number(form.advancePaid) : 0
      };
      await api.post('/api/orders', payload);
      setSuccess('Order created successfully.');
      setModalOpen(false);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save order.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (order) => {
    const newStatus = order.status === 'pending' ? 'completed' : 'pending';
    try {
      await api.put(`/api/orders/${order._id}`, { status: newStatus });
      fetchOrders();
    } catch {
      setError('Failed to update order status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await api.delete(`/api/orders/${id}`);
      setSuccess('Order deleted.');
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete order.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Orders & Advance Payments</h1>
        <p>Manage customer orders, advance payments, and balance tracking</p>
      </div>

      {success && <div className="alert alert-success">✓ {success}</div>}
      {error && <div className="alert alert-error">⚠ {error}</div>}

      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="filter-bar" style={{ margin: 0, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
              🔖 Filter by Status
            </label>
            <select
              id="orders-status-filter"
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" id="add-order-btn" onClick={openAdd}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4v16m8-8H4" />
            </svg>
            New Order
          </button>
        </div>
      </div>

      {loading && <div className="spinner-container"><div className="spinner" /></div>}

      {!loading && (
        <div className="glass-card">
          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>{statusFilter ? `No ${statusFilter} orders found.` : 'No orders yet.'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Advance</th>
                    <th>Mode</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id} onClick={() => setSelectedViewItem(o)} style={{ cursor: 'pointer' }} title="Click to view details">
                      <td data-label="Date" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatDate(o.date)}</td>
                      <td data-label="Customer" style={{ fontWeight: 600 }}>{o.customerName}</td>
                      <td data-label="Item" style={{ color: 'var(--text-secondary)' }}>{o.itemName}</td>
                      <td data-label="Qty" style={{ fontWeight: 600 }}>{o.quantity || 1} {o.unit || 'kg'}</td>
                      <td data-label="Total" style={{ fontWeight: 700 }}>{formatCurrency(o.totalAmount)}</td>
                      <td data-label="Advance" style={{ color: '#4ade80', fontWeight: 600 }}>{formatCurrency(o.advancePaid)}</td>
                      <td data-label="Mode">
                        <span className={`badge badge-${o.advancePaymentMode}`}>
                          {o.advancePaymentMode === 'cash' ? '💵' : o.advancePaymentMode === 'upi' ? '📱' : '💳'}
                          {o.advancePaymentMode.toUpperCase()}
                        </span>
                      </td>
                      <td data-label="Balance" style={{ color: o.balance > 0 ? '#fcd34d' : '#4ade80', fontWeight: 700 }}>
                        {formatCurrency(o.balance)}
                      </td>
                      <td data-label="Status">
                        <button
                          className={`badge badge-${o.status}`}
                          style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                          onClick={(e) => { e.stopPropagation(); handleStatusToggle(o); }}
                          title="Click to toggle status"
                        >
                          {o.status === 'pending' ? '🕐' : '✅'} {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </button>
                      </td>
                      <td data-label="Actions">
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-icon delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(o._id); }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Order">
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">⚠ {formError}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="order-customer">Customer Name</label>
              <input id="order-customer" type="text" name="customerName" className="form-control" placeholder="Customer name" value={form.customerName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="order-date">Order Date & Time</label>
              <input id="order-date" type="datetime-local" name="date" className="form-control" value={form.date} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="order-item">Select Product</label>
              <select id="order-item" name="itemName" className="form-control" value={form.itemName} onChange={handleChange} required>
                <option value="" disabled>Enter your product only</option>
                {products.map(p => (
                  <option key={p._id} value={p.name}>{p.name} (₹{p.price}/{p.unit || 'kg'})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="order-quantity">Quantity ({form.unit})</label>
              <input id="order-quantity" type="number" name="quantity" className="form-control" placeholder="Quantity" min="0" step="0.01" value={form.quantity} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="order-total">Total Amount (₹)</label>
              <input id="order-total" type="number" name="totalAmount" className="form-control" placeholder="0.00" min="0" step="0.01" value={form.totalAmount} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="order-advance">Advance Paid (₹)</label>
              <input id="order-advance" type="number" name="advancePaid" className="form-control" placeholder="0.00" min="0" step="0.01" value={form.advancePaid} onChange={handleChange} required />
            </div>
          </div>

          {/* Live balance preview */}
          {form.totalAmount !== '' && form.advancePaid !== '' && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', marginBottom: 16, fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Balance (auto-calculated)</span>
              <span style={{ fontWeight: 700, color: Number(form.totalAmount) - Number(form.advancePaid) < 0 ? 'var(--danger)' : '#22d3ee' }}>
                ₹{(Number(form.totalAmount) - Number(form.advancePaid)).toFixed(2)}
              </span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="order-payment-mode">Advance Payment Mode</label>
              <select id="order-payment-mode" name="advancePaymentMode" className="form-control" value={form.advancePaymentMode} onChange={handleChange} required>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="order-status">Status</label>
              <select id="order-status" name="status" className="form-control" value={form.status} onChange={handleChange}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {form.advancePaymentMode === 'cash' && (
            <div className="form-row" style={{ marginTop: 8 }}>
              <div className="form-group">
                <label htmlFor="order-cash-received">Cash Received (₹)</label>
                <input
                  id="order-cash-received"
                  type="number"
                  className="form-control"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  Change to Return
                </span>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: cashReceived && Number(cashReceived) < Number(form.advancePaid) ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                  border: cashReceived && Number(cashReceived) < Number(form.advancePaid) ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: cashReceived && Number(cashReceived) < Number(form.advancePaid) ? '#ef4444' : '#4ade80',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '41px'
                }}>
                  ₹{cashReceived && form.advancePaid ? (Number(cashReceived) - Number(form.advancePaid)).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details View Modal */}
      <Modal isOpen={selectedViewItem !== null} onClose={() => setSelectedViewItem(null)} title="Order Details">
        {selectedViewItem && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Order Date & Time</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatDate(selectedViewItem.date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Customer Name</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedViewItem.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Item Description</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedViewItem.itemName} ({selectedViewItem.quantity || 1} {selectedViewItem.unit || 'kg'})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Amount</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(selectedViewItem.totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Advance Paid</span>
                <span style={{ fontWeight: 700, color: '#4ade80' }}>{formatCurrency(selectedViewItem.advancePaid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Remaining Balance</span>
                <span style={{ fontWeight: 800, color: selectedViewItem.balance > 0 ? '#fcd34d' : '#4ade80', fontSize: '1.2rem' }}>{formatCurrency(selectedViewItem.balance)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Advance Mode</span>
                <span className={`badge badge-${selectedViewItem.advancePaymentMode}`}>
                  {selectedViewItem.advancePaymentMode === 'cash' ? '💵 ' : selectedViewItem.advancePaymentMode === 'upi' ? '📱 ' : '💳 '}
                  {selectedViewItem.advancePaymentMode.toUpperCase()}
                </span>
              </div>
              {selectedViewItem.advancePaymentMode === 'cash' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Cash Received</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(selectedViewItem.cashReceived || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Change Returned</span>
                    <span style={{ fontWeight: 800, color: (selectedViewItem.changeReturned || 0) < 0 ? '#ef4444' : '#4ade80' }}>
                      {formatCurrency(selectedViewItem.changeReturned || 0)}
                    </span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
                <span className={`badge badge-${selectedViewItem.status}`}>
                  {selectedViewItem.status === 'pending' ? '🕐 ' : '✅ '}
                  {selectedViewItem.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setSelectedViewItem(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Orders;
