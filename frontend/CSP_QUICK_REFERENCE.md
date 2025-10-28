# 🛡️ CSP Quick Reference Card

**One-page guide for developers**

---

## Current Status

🟡 **Report-Only Mode** (Safe - No blocking)  
📅 **Monitor for:** 1-2 weeks  
🎯 **Next Action:** Test thoroughly, then enable enforcement

---

## Quick Commands

### Test CSP Headers
```bash
cd frontend
./scripts/validate-csp.sh http://localhost:3000
```

### Check Console for Violations
```
1. Open DevTools (F12)
2. Go to Console tab
3. Look for: "Content Security Policy" messages
```

### Enable Enforcement Mode
```bash
# After 1-2 weeks of monitoring
export CSP_REPORT_ONLY=false
```

### Rollback (If Issues)
```bash
export CSP_REPORT_ONLY=true
```

---

## CSP Directives (What's Allowed)

| Directive | What's Allowed |
|-----------|----------------|
| **script-src** | Self, GTM, inline scripts (for MUI) |
| **style-src** | Self, inline styles (for MUI/Emotion) |
| **img-src** | Self, data URIs, all HTTPS |
| **connect-src** | Supabase, Mapbox, GTM, Backend API, Auth providers |
| **font-src** | Self, data URIs |
| **worker-src** | Self, blob (for Mapbox) |
| **frame-src** | Self only (Storybook) |
| **object-src** | None (blocks plugins) |

---

## Common Issues & Quick Fixes

### Script Blocked
```typescript
// frontend/next.config.ts - Add to script-src
"script-src 'self' 'unsafe-inline' https://your-domain.com"
```

### API Call Blocked
```typescript
// frontend/next.config.ts - Add to connect-src
"connect-src 'self' https://your-api.com"
```

### Image Not Loading
```typescript
// Already allows all HTTPS. To restrict:
"img-src 'self' data: blob: https://specific-cdn.com"
```

### Style Not Applied
```typescript
// Should work - 'unsafe-inline' enabled for MUI
// If not, check console for specific error
```

---

## Testing Checklist

**Before Deployment:**
- [ ] Run validation script
- [ ] Test login/auth
- [ ] Test all major features
- [ ] Check console (no violations)
- [ ] Deploy to staging

**In Staging (1-2 weeks):**
- [ ] Monitor daily
- [ ] Test all features
- [ ] Document violations
- [ ] Fix legitimate issues

**Before Enforcement:**
- [ ] No critical violations
- [ ] All features tested
- [ ] Team briefed
- [ ] Rollback plan ready

**After Enforcement:**
- [ ] Monitor closely (24-48h)
- [ ] Check for issues
- [ ] Verify grade: A+

---

## Key Files

| File | Purpose |
|------|---------|
| `next.config.ts` | CSP configuration |
| `SECURITY_CSP.md` | Full documentation |
| `scripts/validate-csp.sh` | Testing script |
| `CSP_IMPLEMENTATION_SUMMARY.md` | Overview |

---

## Emergency Rollback

```bash
# Step 1: Set environment variable
export CSP_REPORT_ONLY=true

# Step 2: Redeploy
# (or restart if using .env.local)

# Step 3: Verify
curl -I https://your-domain.com | grep CSP
# Should show: Content-Security-Policy-Report-Only
```

---

## External Services Whitelisted

✅ Supabase (`*.supabase.co`)  
✅ Mapbox (`*.mapbox.com`)  
✅ Google Tag Manager  
✅ Auth0 / Cognito  
✅ Your Backend API (auto-detected)

---

## Testing URLs

- **CSP Validator**: https://csp-evaluator.withgoogle.com/
- **Security Headers**: https://securityheaders.com/
- **MDN Guide**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

---

## Support

**Issue?** → Check `SECURITY_CSP.md` Troubleshooting section  
**Violation?** → Browser Console shows which directive  
**Need help?** → Review full documentation

---

## Success Indicators

✅ Validation script passes  
✅ No console violations  
✅ All features work  
✅ Grade A+ (after enforcement)

---

**Current Phase:** 1 (Report-Only)  
**Risk Level:** 🟢 LOW  
**Action Required:** Monitor & Test

**For full details:** See `SECURITY_CSP.md`

