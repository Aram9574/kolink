# Email Validation Checklist

## Overview

This document provides a checklist for manually validating transactional email templates across different email clients.

## Prerequisites

- Resend API key configured in `.env.local`
- Valid FROM_EMAIL configured
- Test email address ready

## Available Email Templates

Located in `src/emails/`:

1. **welcome.html** - Welcome email for new users
2. **weekly.html** - Weekly summary email
3. **payment-successful.html** - Payment confirmation email
4. **credits-low.html** - Low credits warning
5. **reset-password.html** - Password reset email
6. **password-changed.tsx** - Password changed notification (React Email)
7. **password-reset.tsx** - Password reset request (React Email)
8. **twofa-enabled.tsx** - 2FA enabled notification (React Email)
9. **support-feedback.tsx** - Support feedback response (React Email)

## Sending Test Emails

### Using the Test Script

```bash
# Send all email templates to test address
npx ts-node scripts/test-emails.ts your-email@example.com all

# Send specific template
npx ts-node scripts/test-emails.ts your-email@example.com welcome
npx ts-node scripts/test-emails.ts your-email@example.com weekly
npx ts-node scripts/test-emails.ts your-email@example.com payment-successful
npx ts-node scripts/test-emails.ts your-email@example.com credits-low
npx ts-node scripts/test-emails.ts your-email@example.com reset-password
```

### Manual API Test

```typescript
// Using Resend API directly
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.FROM_EMAIL!,
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<html>...</html>',
});
```

## Validation Checklist

Test each email template in the following email clients:

### Desktop Clients

- [ ] **Gmail (Web)** - https://mail.google.com
  - [ ] Images load correctly
  - [ ] Buttons are clickable
  - [ ] Styles apply correctly
  - [ ] No text cutoff
  - [ ] Links work
  - [ ] Brand colors display (#F9D65C, #1E1E1E)

- [ ] **Outlook (Web)** - https://outlook.live.com
  - [ ] Images load correctly
  - [ ] Buttons are clickable (table-based buttons)
  - [ ] Styles apply correctly
  - [ ] No text cutoff
  - [ ] Links work

- [ ] **Apple Mail (macOS)**
  - [ ] Images load correctly
  - [ ] Buttons are clickable
  - [ ] Styles apply correctly
  - [ ] No text cutoff
  - [ ] Links work

- [ ] **Yahoo Mail (Web)** - https://mail.yahoo.com
  - [ ] Images load correctly
  - [ ] Buttons are clickable
  - [ ] Styles apply correctly
  - [ ] No text cutoff
  - [ ] Links work

### Mobile Clients

- [ ] **Gmail Mobile (iOS/Android)**
  - [ ] Responsive layout adapts to screen width
  - [ ] Images load correctly
  - [ ] Buttons are tap-friendly (min 44x44px)
  - [ ] Text is readable without zoom
  - [ ] Links work

- [ ] **Apple Mail (iOS)**
  - [ ] Responsive layout adapts to screen width
  - [ ] Images load correctly
  - [ ] Buttons are tap-friendly
  - [ ] Text is readable without zoom
  - [ ] Links work

- [ ] **Outlook Mobile**
  - [ ] Responsive layout adapts to screen width
  - [ ] Images load correctly
  - [ ] Buttons are tap-friendly
  - [ ] Text is readable without zoom
  - [ ] Links work

## Common Issues & Solutions

### Issue 1: Buttons Not Clickable

**Problem:** Link styled as button doesn't work

**Solution:** Use table-based button structure
```html
<!-- ❌ Bad -->
<a href="..." style="background: #F9D65C; padding: 10px;">Button</a>

<!-- ✅ Good -->
<table role="presentation" cellspacing="0" cellpadding="0">
  <tr>
    <td style="background: #F9D65C; border-radius: 5px;">
      <a href="..." style="display: inline-block; padding: 12px 24px; color: #1E1E1E; text-decoration: none;">
        Button Text
      </a>
    </td>
  </tr>
</table>
```

### Issue 2: Styles Not Applied

**Problem:** CSS styles from `<style>` tag don't apply

**Solution:** Use inline styles
```html
<!-- ❌ Bad -->
<style>.text { color: #333; }</style>
<p class="text">Content</p>

<!-- ✅ Good -->
<p style="color: #333; font-size: 16px; line-height: 1.6;">Content</p>
```

### Issue 3: Broken Images

**Problem:** Images don't load

**Solution:** Use absolute URLs
```html
<!-- ❌ Bad -->
<img src="/logo.png" alt="Logo" />

<!-- ✅ Good -->
<img src="https://kolink.es/logo.png" alt="Logo" />
```

### Issue 4: Not Responsive on Mobile

**Problem:** Email doesn't adapt to mobile screen

**Solution:** Use max-width and media queries
```html
<table style="max-width: 600px; width: 100%;">
  <tr>
    <td style="padding: 20px;">
      Content
    </td>
  </tr>
</table>

<style>
  @media only screen and (max-width: 600px) {
    .container {
      width: 100% !important;
      padding: 10px !important;
    }
  }
</style>
```

## Testing Tools (Optional)

### Litmus (Paid)
- URL: https://litmus.com/
- Features: Test in 90+ email clients
- Price: ~$99/month

### Email on Acid (Paid)
- URL: https://www.emailonacid.com/
- Features: Similar to Litmus
- Price: ~$99/month

### Mailtrap (Free Tier Available)
- URL: https://mailtrap.io/
- Features: Email testing sandbox
- Price: Free for development

## Post-Validation Steps

After successful validation:

1. **Document Issues Found:**
   - Create tickets for any issues
   - Prioritize critical issues (broken links, missing content)

2. **Fix Issues:**
   - Update email templates
   - Re-test affected templates

3. **Update Production:**
   - Commit template changes
   - Deploy to production
   - Monitor email delivery metrics in Resend dashboard

## Metrics to Monitor

After deploying to production, monitor:

- **Delivery Rate:** Should be >95%
- **Open Rate:** Benchmark ~20-30% for transactional emails
- **Click Rate:** Varies by email type
- **Bounce Rate:** Should be <2%
- **Spam Rate:** Should be <0.1%

Access metrics in Resend Dashboard: https://resend.com/

## Notes

- Test emails are prefixed with "TEST -" in subject line
- Use different test email addresses for thorough testing
- Test both light and dark mode where applicable
- Verify all dynamic variables are replaced correctly
- Check email renders correctly in spam/junk folders

## Completion Criteria

Email validation is complete when:

- [ ] All 9 templates tested
- [ ] Tested in at least 3 desktop clients (Gmail, Outlook, Apple Mail)
- [ ] Tested in at least 2 mobile clients (Gmail Mobile, Apple Mail)
- [ ] All images load correctly
- [ ] All buttons/links work
- [ ] Responsive design works on mobile
- [ ] No critical rendering issues
- [ ] All dynamic variables render correctly
- [ ] Brand colors display correctly
