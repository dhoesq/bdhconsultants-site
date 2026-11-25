# Cloudflare zone settings to tighten (needs your yes)

All five Cloudflare zones currently have Always Use HTTPS off, minimum TLS 1.0, and HSTS off.
For bdhconsultants.com, sinclegal.com, environmentlending.com, and remedialhusband.com (DH-Kaizen), and kaizenailab.com once it is in DH-Kaizen:

- SSL/TLS, then Edge Certificates: Always Use HTTPS on; Minimum TLS Version 1.2.
- HSTS: max-age 6 months, include subdomains on, preload off (turn on later).
- sinclegal.com is DNS-only to Carrd, so these settings do not reach it; Carrd serves HTTPS itself.

Email spoofing protection:
- remedialhusband.com has no email records. If it will not send mail yet, add `TXT @ "v=spf1 -all"` and `TXT _dmarc "v=DMARC1; p=reject;"`. Once launch emails start, replace these with your sender's SPF and DKIM, and start DMARC at p=none.
- The other domains have DMARC at p=none. Move to p=quarantine after a few weeks of clean reports.
