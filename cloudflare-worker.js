/**
 * FortiAI Pro - Groq Proxy Worker
 * 
 * Deploy this to Cloudflare Workers to proxy API requests
 * and hide direct connections to api.groq.com.
 * 
 * Routes:
 *   /groq/*   → api.groq.com
 * 
 * Features:
 *   - Masks User-Agent as Chrome 120
 *   - Adds CORS headers for extension access
 *   - Strips identifying headers
 */

const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// CORS headers for browser extension access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Route based on path prefix
    if (path.startsWith('/groq/')) {
      return handleGroqProxy(request, path);
    } else if (path === '/' || path === '/health') {
      // Health check endpoint
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'FortiAI Proxy',
        routes: ['/groq/*']
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
};

async function handleGroqProxy(request, path) {
  // Remove /groq prefix and forward to api.groq.com
  const targetPath = path.replace('/groq', '');
  const targetUrl = `https://api.groq.com${targetPath}`;

  return proxyRequest(request, targetUrl);
}

async function proxyRequest(request, targetUrl) {
  // Clone headers and modify
  const headers = new Headers(request.headers);
  
  // Mask User-Agent
  headers.set('User-Agent', CHROME_USER_AGENT);
  
  // Remove potentially identifying headers
  headers.delete('CF-Connecting-IP');
  headers.delete('CF-IPCountry');
  headers.delete('CF-Ray');
  headers.delete('X-Forwarded-For');
  headers.delete('X-Real-IP');

  // Build proxy request
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'follow'
  });

  try {
    const response = await fetch(proxyRequest);
    
    // Clone response and add CORS headers
    const responseHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Proxy Error', 
      message: error.message 
    }), {
      status: 502,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  }
}
