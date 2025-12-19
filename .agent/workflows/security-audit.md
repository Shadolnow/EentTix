---
description: Perform a security audit on the codebase, checking for vulnerabilities and secrets.
---

1. **Dependency Vulnerability Scan**
   Check for known vulnerabilities in the project's npm dependencies.
   ```bash
   npm audit
   ```

2. **Static Code Analysis**
   Run the linter to catch code quality issues, bug risks, and potential security flaws (like using `eval` or unsafe DOM methods).
   ```bash
   npm run lint
   ```

3. **Hardcoded Secret Scan (Basic)**
   Search for common patterns of hardcoded secrets like API keys or tokens.
   *(Note: This is a basic grep check. For production, consider using tools like trufflehog or git-secrets)*
   ```powershell
   grep -r "API_KEY" src/ || echo "No API_KEY text found"
   grep -r "SECRET" src/ || echo "No SECRET text found"
   grep -r "ghp_" . || echo "No GitHub tokens found"
   ```

4. **Review Security Headers**
   Verify that `vercel.json` exists and contains security headers.
   ```bash
   cat vercel.json
   ```
