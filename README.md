TDC userscripts
===========

- `tdc_jira_autolinker.user.js` &mdash; scans for JIRA ticket IDs (MN-123, or LISA-32, or LFEDM-12, etc.) and auto-links them to [lisausa.atlassian.com](http://lisausa.atlassian.com). Only applies to text nodes that are not already in an `<a>`. Currently set to operate only on the following domains; feel free to add additional if you find another place we're routinely posting those IDs:
  - `*.github.com`
  - `*.hipchat.com`
  - `webmail.thedolancompany.com`
