/**
 * Service Worker: 公開ページ（GitHub Pages）でも完全オフライン動作を実現する。
 *
 * 戦略はネットワーク優先・キャッシュフォールバック:
 * - オンライン時は常に最新を取得し、成功レスポンスをキャッシュへ保存する
 * - オフライン時はキャッシュから返す（初回訪問時に全アセットをプリキャッシュ済み）
 * この方式ならデプロイのたびにキャッシュバージョンを上げる運用は不要。
 * ASSETS の構成が変わったときだけ CACHE_NAME を上げて旧キャッシュを掃除する。
 */
'use strict'

const CACHE_NAME = 'oikomikun-v1'

const ASSETS = [
  '.',
  'index.html',
  'css/style.css',
  'js/timer.js',
  'js/app.js',
  'image/favicon.svg',
  'image/apple-touch-icon.png',
  'image/icon-192.png',
  'image/icon-512.png',
  'manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() =>
        caches
          .match(request, { ignoreSearch: true })
          .then((cached) => cached || caches.match('index.html'))
      )
  )
})
