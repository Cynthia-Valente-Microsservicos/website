import { useState, useEffect } from 'react'
import './App.css'

async function api(endpoint, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(endpoint, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(res.status)
  return res.json().catch(() => null)
}

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

const formatDate = (d) =>
  new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

function ProductAvatar({ name }) {
  const colors = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div style={{
      width: 56, height: 56, borderRadius: 12,
      background: colors[idx] + '22',
      color: colors[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.4rem', fontWeight: 700, flexShrink: 0,
    }}>
      {name[0].toUpperCase()}
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('store')
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [showProductForm, setShowProductForm] = useState(false)
  const [productForm, setProductForm] = useState({ name: '', price: '', unit: '' })

  useEffect(() => { loadProducts() }, [])

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api('/products')
      setProducts(data ?? [])
    } catch {
      setError('Não foi possível carregar os produtos.')
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async (currentUser = user) => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      const data = await api(`/orders?idAccount=${currentUser.id}`)
      setOrders(data ?? [])
    } catch {
      setError('Não foi possível carregar os pedidos.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: authForm.email, password: authForm.password },
      })
      setUser(data)
      setView('store')
      notify('Bem-vindo de volta!')
    } catch {
      setError('Email ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: { name: authForm.name, email: authForm.email, password: authForm.password },
      })
      setUser(data)
      setView('store')
      notify('Conta criada com sucesso!')
    } catch {
      setError('Falha no cadastro. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await api('/auth/logout').catch(() => {})
    setUser(null)
    setCart([])
    setOrders([])
    setView('store')
    notify('Até logo!')
  }

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id)
      if (found) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    notify(`${product.name} adicionado ao carrinho`)
  }

  const removeFromCart = (id) => setCart((p) => p.filter((i) => i.product.id !== id))

  const setQuantity = (id, qty) => {
    if (qty <= 0) return removeFromCart(id)
    setCart((p) => p.map((i) => i.product.id === id ? { ...i, quantity: qty } : i))
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)

  const handleCheckout = async () => {
    if (!user) { setView('auth'); return }
    setLoading(true)
    setError(null)
    try {
      await api('/orders', {
        method: 'POST',
        body: { items: cart.map((i) => ({ idProduct: i.product.id, quantity: i.quantity })) },
      })
      setCart([])
      notify('Pedido realizado com sucesso!')
      setView('orders')
      loadOrders()
    } catch {
      setError('Falha ao realizar o pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api('/products', {
        method: 'POST',
        headers: { role: 'ADMIN' },
        body: { name: productForm.name, price: parseFloat(productForm.price), unit: productForm.unit },
      })
      setProductForm({ name: '', price: '', unit: '' })
      setShowProductForm(false)
      loadProducts()
      notify('Produto criado!')
    } catch {
      setError('Falha ao criar produto.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`Deletar "${name}"?`)) return
    try {
      await fetch(`/products/${id}`, { method: 'DELETE', headers: { role: 'ADMIN' }, credentials: 'include' })
      loadProducts()
      notify('Produto removido')
    } catch {
      notify('Falha ao deletar produto.', 'error')
    }
  }

  const goToOrders = () => { setView('orders'); loadOrders() }

  return (
    <div className="app">
      {toast && <div className={`notification ${toast.type}`}>{toast.msg}</div>}

      <nav className="navbar">
        <div className="nav-content">
          <button className="nav-logo" onClick={() => setView('store')}>
            🛍 Store
          </button>
          <div className="nav-links">
            <button className={`nav-link ${view === 'store' ? 'active' : ''}`} onClick={() => setView('store')}>
              Produtos
            </button>
            {user && (
              <button className={`nav-link ${view === 'orders' ? 'active' : ''}`} onClick={goToOrders}>
                Pedidos
              </button>
            )}
          </div>
          <div className="nav-actions">
            {user ? (
              <>
                <span className="nav-user">Olá, {user.name || user.email}</span>
                <button className="btn-ghost" onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <button className="btn-outline" onClick={() => { setView('auth'); setError(null) }}>
                Entrar
              </button>
            )}
            <button className="cart-btn" onClick={() => setView('cart')}>
              🛒
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </nav>

      <main className="main">

        {view === 'store' && (
          <div className="store-view">
            <div className="store-header">
              <div>
                <h1>Nossos Produtos</h1>
                <p className="subtitle">Encontre tudo o que você precisa</p>
              </div>
              {user?.role === 'ADMIN' && (
                <button className="btn-primary" onClick={() => setShowProductForm((v) => !v)}>
                  {showProductForm ? '✕ Cancelar' : '+ Novo produto'}
                </button>
              )}
            </div>

            {showProductForm && (
              <form className="product-form card" onSubmit={handleCreateProduct}>
                <h3>Cadastrar produto</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome</label>
                    <input required placeholder="Nome do produto" value={productForm.name}
                      onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Preço (R$)</label>
                    <input required type="number" step="0.01" min="0" placeholder="0,00"
                      value={productForm.price}
                      onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Unidade</label>
                    <input required placeholder="kg, un, L…" value={productForm.unit}
                      onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value }))} />
                  </div>
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Salvando…' : 'Criar produto'}
                </button>
              </form>
            )}

            {!showProductForm && error && <div className="error-msg" style={{ marginBottom: 20 }}>{error}</div>}

            {loading && !showProductForm ? (
              <div className="loading">Carregando produtos…</div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <span>📦</span>
                <p>Nenhum produto disponível no momento.</p>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((p) => (
                  <div key={p.id} className="product-card">
                    <ProductAvatar name={p.name} />
                    <div className="product-info">
                      <h3>{p.name}</h3>
                      <span className="product-unit">{p.unit}</span>
                      <span className="product-price">{formatBRL(p.price)}</span>
                    </div>
                    <div className="product-actions">
                      <button className="btn-primary btn-add" onClick={() => addToCart(p)}>
                        Adicionar
                      </button>
                      {user?.role === 'ADMIN' && (
                        <button className="btn-danger-sm" title="Deletar"
                          onClick={() => handleDeleteProduct(p.id, p.name)}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'auth' && (
          <div className="auth-view">
            <div className="auth-card card">
              <div className="auth-tabs">
                <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('login'); setError(null) }}>
                  Entrar
                </button>
                <button className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('register'); setError(null) }}>
                  Criar conta
                </button>
              </div>

              {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

              {authMode === 'login' ? (
                <form className="auth-form" onSubmit={handleLogin}>
                  <div className="form-group">
                    <label>Email</label>
                    <input required type="email" placeholder="seu@email.com" value={authForm.email}
                      onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Senha</label>
                    <input required type="password" placeholder="••••••••" value={authForm.password}
                      onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))} />
                  </div>
                  <button type="submit" className="btn-primary btn-full" disabled={loading}>
                    {loading ? 'Entrando…' : 'Entrar'}
                  </button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleRegister}>
                  <div className="form-group">
                    <label>Nome</label>
                    <input required placeholder="Seu nome" value={authForm.name}
                      onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input required type="email" placeholder="seu@email.com" value={authForm.email}
                      onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Senha</label>
                    <input required type="password" placeholder="••••••••" value={authForm.password}
                      onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))} />
                  </div>
                  <button type="submit" className="btn-primary btn-full" disabled={loading}>
                    {loading ? 'Criando conta…' : 'Criar conta'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {view === 'cart' && (
          <div className="cart-view">
            <h1>Carrinho</h1>
            {cart.length === 0 ? (
              <div className="empty-state">
                <span>🛒</span>
                <p>Seu carrinho está vazio.</p>
                <button className="btn-primary" onClick={() => setView('store')}>Ver produtos</button>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-items">
                  {cart.map((item) => (
                    <div key={item.product.id} className="cart-item card">
                      <div className="cart-item-info">
                        <ProductAvatar name={item.product.name} />
                        <div>
                          <h4>{item.product.name}</h4>
                          <span className="product-unit">{item.product.unit}</span>
                        </div>
                      </div>
                      <div className="cart-item-controls">
                        <div className="quantity-control">
                          <button onClick={() => setQuantity(item.product.id, item.quantity - 1)}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => setQuantity(item.product.id, item.quantity + 1)}>+</button>
                        </div>
                        <span className="cart-item-total">
                          {formatBRL(item.product.price * item.quantity)}
                        </span>
                        <button className="btn-danger-sm" onClick={() => removeFromCart(item.product.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary card">
                  <h3>Resumo do pedido</h3>
                  <div className="summary-row">
                    <span>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'itens'})</span>
                    <span>{formatBRL(cartTotal)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>{formatBRL(cartTotal)}</span>
                  </div>
                  {error && <div className="error-msg">{error}</div>}
                  <button className="btn-primary btn-full" onClick={handleCheckout} disabled={loading}>
                    {loading ? 'Processando…' : user ? 'Finalizar pedido' : 'Entrar para comprar'}
                  </button>
                  <button className="btn-ghost btn-full" onClick={() => setView('store')}>
                    ← Continuar comprando
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'orders' && (
          <div className="orders-view">
            <h1>Meus Pedidos</h1>
            {loading ? (
              <div className="loading">Carregando pedidos…</div>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <span>📋</span>
                <p>Você ainda não fez nenhum pedido.</p>
                <button className="btn-primary" onClick={() => setView('store')}>
                  Fazer meu primeiro pedido
                </button>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-card card">
                    <div className="order-header">
                      <span className="order-id">#{order.id.slice(-8).toUpperCase()}</span>
                      <span className="order-date">{formatDate(order.date)}</span>
                      <span className="order-total">{formatBRL(order.total)}</span>
                    </div>
                    <div className="order-items">
                      {order.items?.map((item) => (
                        <div key={item.id} className="order-item">
                          <span>{item.product?.name ?? 'Produto'}</span>
                          <span>{item.quantity}×</span>
                          <span>{formatBRL(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      <footer className="footer">
        <p>© 2025 Store · Plataformas, Microsserviços e APIs · INSPER</p>
      </footer>
    </div>
  )
}
