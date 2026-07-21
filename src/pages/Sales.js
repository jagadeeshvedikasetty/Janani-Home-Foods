import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const PAYMENT_MODES = ['cash', 'upi', 'card'];

function toLocalDatetimeString(d = new Date()) {
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  date.setMinutes(date.getMinutes() - offset);
  return date.toISOString().slice(0, 16);
}

const EMPTY_FORM = {
  date: toLocalDatetimeString(),
  itemName: '',
  quantity: '',
  amount: '',
  paymentMode: 'cash',
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

function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cashReceived, setCashReceived] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = filterDate ? { date: filterDate } : {};
      const resSales = await api.get('/api/sales', { params });
      setSales(resSales.data);

      const resProducts = await api.get('/api/products');
      setProducts(resProducts.data);
    } catch {
      setError('Failed to load sales or products.');
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

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
      
      // Auto-calculate if product or quantity changes
      if (name === 'itemName' || name === 'quantity') {
        const prod = products.find(p => p.name === updated.itemName);
        const qty = Number(updated.quantity) || 0;
        if (prod) {
          updated.amount = (prod.pricePerKg * qty).toFixed(2);
        } else {
          updated.amount = '';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.itemName.trim()) return setFormError('Item name is required.');
    if (!form.amount || Number(form.amount) < 0) return setFormError('Valid amount is required.');
    if (!form.paymentMode) return setFormError('Payment mode is required.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        date: new Date(form.date).toISOString(),
        quantity: Number(form.quantity) || 1,
        amount: Number(form.amount),
        cashReceived: form.paymentMode === 'cash' ? Number(cashReceived || 0) : 0,
        changeReturned: form.paymentMode === 'cash' ? Number(cashReceived || 0) - Number(form.amount) : 0
      };
      await api.post('/api/sales', payload);
      setSuccess('Sale added successfully.');
      setModalOpen(false);
      fetchSales();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save sale.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sale entry?')) return;
    try {
      await api.delete(`/api/sales/${id}`);
      setSuccess('Sale deleted.');
      fetchSales();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete sale.');
    }
  };

  const totalAmount = sales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Daily Sales</h1>
        <p>Record and manage all sale transactions</p>
      </div>

      {success && <div className="alert alert-success">✓ {success}</div>}
      {error && <div className="alert alert-error">⚠ {error}</div>}

      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="filter-bar" style={{ margin: 0, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
              📅 Filter by Date
            </label>
            <input
              id="sales-filter-date"
              type="date"
              className="form-control"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>
                Clear
              </button>
            )}
          </div>
          <button className="btn btn-primary" id="add-sale-btn" onClick={openAdd}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Add Sale
          </button>
        </div>
      </div>

      {loading && <div className="spinner-container"><div className="spinner" /></div>}

      {!loading && (
        <div className="glass-card">
          {sales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧾</div>
              <p>{filterDate ? 'No sales found for this date.' : 'No sales recorded yet.'}</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item / Description</th>
                      <th>Qty</th>
                      <th>Amount</th>
                      <th>Payment Mode</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s._id} onClick={() => setSelectedViewItem(s)} style={{ cursor: 'pointer' }} title="Click to view details">
                        <td data-label="Date" style={{ color: 'var(--text-secondary)' }}>{formatDate(s.date)}</td>
                        <td data-label="Item" style={{ fontWeight: 600 }}>{s.itemName}</td>
                        <td data-label="Qty" style={{ fontWeight: 600 }}>{s.quantity || 1}</td>
                        <td data-label="Amount" style={{ fontWeight: 700, color: '#4ade80' }}>{formatCurrency(s.amount)}</td>
                        <td data-label="Payment Mode">
                          <span className={`badge badge-${s.paymentMode}`}>
                            {s.paymentMode === 'cash' ? '💵' : s.paymentMode === 'upi' ? '📱' : '💳'}
                            {s.paymentMode.toUpperCase()}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-icon delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(s._id); }}>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total ({sales.length} entries)
                  </p>
                  <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80' }}>{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New Sale">
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">⚠ {formError}</div>}

          <div className="form-group">
            <label htmlFor="sale-date">Date & Time</label>
            <input id="sale-date" type="datetime-local" name="date" className="form-control" value={form.date} onChange={handleChange} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sale-item">Select Product</label>
              <select id="sale-item" name="itemName" className="form-control" value={form.itemName} onChange={handleChange} required>
                <option value="" disabled>Enter your product only</option>
                {products.map(p => (
                  <option key={p._id} value={p.name}>{p.name} (₹{p.pricePerKg}/kg)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="sale-quantity">Quantity</label>
              <input id="sale-quantity" type="number" name="quantity" className="form-control" placeholder="Quantity (e.g. Kg)" min="0" step="0.01" value={form.quantity} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sale-amount">Amount (₹)</label>
              <input id="sale-amount" type="number" name="amount" className="form-control" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="sale-payment-mode">Payment Mode</label>
              <select id="sale-payment-mode" name="paymentMode" className="form-control" value={form.paymentMode} onChange={handleChange} required>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {form.paymentMode === 'cash' && (
            <div className="form-row" style={{ marginTop: 8 }}>
              <div className="form-group">
                <label htmlFor="sale-cash-received">Cash Received (₹)</label>
                <input
                  id="sale-cash-received"
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
                  background: cashReceived && Number(cashReceived) < Number(form.amount) ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                  border: cashReceived && Number(cashReceived) < Number(form.amount) ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: cashReceived && Number(cashReceived) < Number(form.amount) ? '#ef4444' : '#4ade80',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '41px'
                }}>
                  ₹{cashReceived && form.amount ? (Number(cashReceived) - Number(form.amount)).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add Sale'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details View Modal */}
      <Modal isOpen={selectedViewItem !== null} onClose={() => setSelectedViewItem(null)} title="Sale Details">
        {selectedViewItem && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatDate(selectedViewItem.date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Item Description</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedViewItem.itemName} ({selectedViewItem.quantity || 1})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Amount Paid</span>
                <span style={{ fontWeight: 800, color: '#4ade80', fontSize: '1.2rem' }}>{formatCurrency(selectedViewItem.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Payment Mode</span>
                <span className={`badge badge-${selectedViewItem.paymentMode}`}>
                  {selectedViewItem.paymentMode === 'cash' ? '💵 ' : selectedViewItem.paymentMode === 'upi' ? '📱 ' : '💳 '}
                  {selectedViewItem.paymentMode.toUpperCase()}
                </span>
              </div>
              {selectedViewItem.paymentMode === 'cash' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
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

export default Sales;
