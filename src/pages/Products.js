import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const EMPTY_FORM = {
  name: '',
  pricePerKg: '',
};

function formatCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/products');
      setProducts(res.data);
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditItem(product);
    setForm({
      name: product.name,
      pricePerKg: product.pricePerKg,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setFormError('Product name is required.');
    if (!form.pricePerKg || Number(form.pricePerKg) < 0) return setFormError('Valid price is required.');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        pricePerKg: Number(form.pricePerKg),
      };
      if (editItem) {
        await api.put(`/api/products/${editItem._id}`, payload);
        setSuccess('Product updated successfully.');
      } else {
        await api.post('/api/products', payload);
        setSuccess('Product added successfully.');
      }
      setModalOpen(false);
      fetchProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      setSuccess('Product deleted.');
      fetchProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete product.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <p>Manage your product list and prices</p>
      </div>

      {success && <div className="alert alert-success">✓ {success}</div>}
      {error && <div className="alert alert-error">⚠ {error}</div>}

      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="filter-bar" style={{ margin: 0, justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {loading && <div className="spinner-container"><div className="spinner" /></div>}

      {!loading && (
        <div className="glass-card">
          {products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>No products found. Add your first product!</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Price per Kg</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id}>
                      <td data-label="Product Name" style={{ fontWeight: 600 }}>{p.name}</td>
                      <td data-label="Price per Kg" style={{ fontWeight: 700, color: '#4ade80' }}>
                        {formatCurrency(p.pricePerKg)}
                      </td>
                      <td data-label="Actions">
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-icon edit" title="Edit" onClick={() => openEdit(p)}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="btn-icon delete" title="Delete" onClick={() => handleDelete(p._id)}>
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Product' : 'Add New Product'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">⚠ {formError}</div>}

          <div className="form-group">
            <label htmlFor="product-name">Product Name</label>
            <input id="product-name" type="text" name="name" className="form-control" placeholder="e.g. Rice, Wheat" value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="product-price">Price per Kg (₹)</label>
            <input id="product-price" type="number" name="pricePerKg" className="form-control" placeholder="0.00" min="0" step="0.01" value={form.pricePerKg} onChange={handleChange} required />
          </div>

          <div className="form-actions" style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editItem ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Products;
