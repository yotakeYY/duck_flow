/* coi-serviceworker v0.1.7
 * 通过 Service Worker 拦截响应并注入 COOP/COEP 头
 * 使 GitHub Pages 等不支持自定义头的托管平台也能正常使用 SharedArrayBuffer
 * 来源：https://github.com/gzuidhof/coi-serviceworker
 */
"use strict";
(() => {
    const n = new URLSearchParams(self.location.search);
    function e() {
        return new Response(null, {
            status: 200,
            headers: {
                "Cross-Origin-Opener-Policy": "same-origin",
                "Cross-Origin-Embedder-Policy": "require-corp",
                "Cross-Origin-Resource-Policy": "same-origin"
            }
        });
    }
    if (typeof window === "undefined") {
        self.addEventListener("install", () => self.skipWaiting());
        self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
        self.addEventListener("fetch", e => {
            const t = e.request;
            if (t.cache === "only-if-cached" && t.mode !== "same-origin") return;
            e.respondWith(
                fetch(t).then(response => {
                    if (response.status === 0) return response;
                    const headers = new Headers(response.headers);
                    headers.set("Cross-Origin-Opener-Policy", "same-origin");
                    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
                    headers.set("Cross-Origin-Resource-Policy", "same-origin");
                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers
                    });
                })
            );
        });
    } else {
        // メインスレッド側：Service Worker を登録してページをリロード
        const r = document.currentScript;
        async function o() {
            const e = await navigator.serviceWorker.register(r.src).catch(console.error);
            if (e && e.active) {
                if (crossOriginIsolated) return;
                location.reload();
            }
        }
        if (!crossOriginIsolated) {
            o();
        }
    }
})();
