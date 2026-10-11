const base = 'http://localhost:5000';
const results = [];

function addResult(name, pass, detail) {
  results.push({ name, pass: pass ? 'PASS' : 'FAIL', detail });
}

async function request(url, options = {}) {
  const { headers: requestHeaders = {}, ...rest } = options;
  const response = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...requestHeaders,
    },
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

(async () => {
  try {
    const health = await request(`${base}/api/health`);
    addResult('API health', health.ok, JSON.stringify(health.data));

    const empLogin = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'employee1@company.com', password: 'Employee1@123' }),
    });
    addResult('Employee login', empLogin.ok, JSON.stringify(empLogin.data));
    const empToken = empLogin.data.token;
    const empHeaders = { Authorization: `Bearer ${empToken}` };

    const title = 'Automated Voucher ' + Date.now();
    const createVoucher = await request(`${base}/api/vouchers`, {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({
        voucher_date: '2026-10-12',
        expense_date: '2026-10-11',
        department: 'Operations',
        title,
        category: 'Travel',
        description: 'Automated test voucher',
        amount: 1250.5,
        employee_id: 'EMP-101',
      }),
    });
    addResult(
      'Create voucher as employee',
      createVoucher.ok && createVoucher.data.voucher && createVoucher.data.voucher.status === 'DRAFT',
      JSON.stringify(createVoucher.data)
    );
    const voucherId = createVoucher.data.voucher.id;

    const invalidAmount = await request(`${base}/api/vouchers`, {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({
        voucher_date: '2026-10-12',
        expense_date: '2026-10-11',
        department: 'Operations',
        title: 'Zero Amount Test',
        category: 'Travel',
        description: 'Invalid amount test',
        amount: 0,
        employee_id: 'EMP-102',
      }),
    });
    addResult('Amount 0 rejected', !invalidAmount.ok && invalidAmount.status === 400, JSON.stringify(invalidAmount.data));

    const submitWithoutSignature = await request(`${base}/api/vouchers/${voucherId}/submit`, {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({}),
    });
    addResult('Submit without signature rejected', !submitWithoutSignature.ok && submitWithoutSignature.status === 400, JSON.stringify(submitWithoutSignature.data));

    const submitWithSignature = await request(`${base}/api/vouchers/${voucherId}/submit`, {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({ employee_signature: '/uploads/test-employee-signature.png' }),
    });
    addResult('Submit with signature', submitWithSignature.ok && submitWithSignature.data.voucher.status === 'PENDING_APPROVAL', JSON.stringify(submitWithSignature.data));

    const editSubmitted = await request(`${base}/api/vouchers/${voucherId}`, {
      method: 'PUT',
      headers: empHeaders,
      body: JSON.stringify({ title: 'Should fail' }),
    });
    addResult('Edit submitted voucher rejected', !editSubmitted.ok && editSubmitted.status === 400, JSON.stringify(editSubmitted.data));

    const deleteSubmitted = await request(`${base}/api/vouchers/${voucherId}`, {
      method: 'DELETE',
      headers: empHeaders,
    });
    addResult('Delete submitted voucher rejected', !deleteSubmitted.ok && deleteSubmitted.status === 400, JSON.stringify(deleteSubmitted.data));

    const directorLogin = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'director@company.com', password: 'Director@123' }),
    });
    addResult('Director login', directorLogin.ok, JSON.stringify(directorLogin.data));
    const directorToken = directorLogin.data.token;
    const directorHeaders = { Authorization: `Bearer ${directorToken}` };

    const rejectWithoutReason = await request(`${base}/api/vouchers/${voucherId}/reject`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({}),
    });
    addResult('Reject without reason rejected', !rejectWithoutReason.ok && rejectWithoutReason.status === 400, JSON.stringify(rejectWithoutReason.data));

    const rejectWithReason = await request(`${base}/api/vouchers/${voucherId}/reject`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({ rejection_reason: 'Duplicate claim and policy violation' }),
    });
    addResult('Reject with reason', rejectWithReason.ok && rejectWithReason.data.voucher.status === 'REJECTED', JSON.stringify(rejectWithReason.data));

    const emp2Login = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'employee2@company.com', password: 'Employee2@123' }),
    });
    const emp2Token = emp2Login.data.token;
    const emp2Headers = { Authorization: `Bearer ${emp2Token}` };
    const secondVoucher = await request(`${base}/api/vouchers`, {
      method: 'POST',
      headers: emp2Headers,
      body: JSON.stringify({
        voucher_date: '2026-10-13',
        expense_date: '2026-10-12',
        department: 'Finance',
        title: 'Director Approve Test ' + Date.now(),
        category: 'Software',
        description: 'Approval test voucher',
        amount: 799.99,
        employee_id: 'EMP-202',
      }),
    });
    const secondVoucherId = secondVoucher.data.voucher.id;
    addResult('Create second employee voucher', secondVoucher.ok && secondVoucher.data.voucher.status === 'DRAFT', JSON.stringify(secondVoucher.data));

    const secondSubmit = await request(`${base}/api/vouchers/${secondVoucherId}/submit`, {
      method: 'POST',
      headers: emp2Headers,
      body: JSON.stringify({ employee_signature: '/uploads/employee2-signature.png' }),
    });
    addResult('Submit second voucher', secondSubmit.ok && secondSubmit.data.voucher.status === 'PENDING_APPROVAL', JSON.stringify(secondSubmit.data));

    const directorApprove = await request(`${base}/api/vouchers/${secondVoucherId}/approve`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({ director_signature: '/uploads/director-signature.png' }),
    });
    addResult('Director approve voucher', directorApprove.ok && directorApprove.data.voucher.status === 'APPROVED', JSON.stringify(directorApprove.data));

    const accountsLogin = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'accounts@company.com', password: 'Accounts@123' }),
    });
    const accountsToken = accountsLogin.data.token;
    const accountsHeaders = { Authorization: `Bearer ${accountsToken}` };
    const accountsCreate = await request(`${base}/api/vouchers`, {
      method: 'POST',
      headers: accountsHeaders,
      body: JSON.stringify({
        voucher_date: '2026-10-14',
        expense_date: '2026-10-13',
        department: 'Accounts',
        title: 'Accounts Forbidden',
        category: 'Misc',
        description: 'Should fail',
        amount: 50,
      }),
    });
    addResult('Accounts create voucher forbidden', !accountsCreate.ok && accountsCreate.status === 403, JSON.stringify(accountsCreate.data));

    console.log('| Test | Result | Detail |');
    console.log('| --- | --- | --- |');
    for (const result of results) {
      console.log(`| ${result.name} | ${result.pass} | ${String(result.detail).replace(/\|/g, '\\|')} |`);
    }
  } catch (error) {
    console.error('SCRIPT_ERROR:', error);
    process.exit(1);
  }
})();
