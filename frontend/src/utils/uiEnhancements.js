import toast from 'react-hot-toast'

function focusSearch() {
  const search = document.querySelector('header input[type="text"]')
  if (search) search.focus()
}

function animateCount(el) {
  const target = Number(el.dataset.count || el.textContent.replace(/[^0-9.-]/g, ''))
  if (!target || isNaN(target)) return
  const duration = 900
  const start = performance.now()
  const from = 0
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1)
    const value = Math.floor(from + (target - from) * progress)
    el.textContent = value.toLocaleString()
    if (progress < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

export default function initUI() {
  // keyboard shortcut: press `/` to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault()
      focusSearch()
      toast('Search focused — type to quickly find pages', { icon: '🔎' })
    }
  })

  // notification bell click
  const bell = document.querySelector('.notification-btn')
  if (bell) {
    bell.addEventListener('click', () => {
      toast.dismiss()
      toast('No new notifications', { icon: '🔔' })
    })
  }

  // animate KPI counters when they enter viewport
  const counters = Array.from(document.querySelectorAll('[data-count]'))
  if (counters.length) {
    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target)
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.4 })
    counters.forEach(c => obs.observe(c))
  }

  // subtle hover ripple for primary buttons (uses CSS accent color)
  function hexToRgba(hex, alpha = 0.5) {
    if (!hex) return `rgba(99,102,241,${alpha})`
    hex = hex.replace('#','')
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    const int = parseInt(hex, 16)
    const r = (int >> 16) & 255
    const g = (int >> 8) & 255
    const b = int & 255
    return `rgba(${r},${g},${b},${alpha})`
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-primary, .btn-secondary, .btn-ghost, button')
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const ripple = document.createElement('span')
    ripple.className = 'ui-ripple'
    ripple.style.left = `${e.clientX - rect.left}px`
    ripple.style.top = `${e.clientY - rect.top}px`
    // try to use CSS variable --accent-2 for ripple color
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-2')?.trim() || '#6366f1'
    ripple.style.background = hexToRgba(accent || '#6366f1', 0.24)
    btn.appendChild(ripple)
    setTimeout(() => ripple.remove(), 520)
  })
}
