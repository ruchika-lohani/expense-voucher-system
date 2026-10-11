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

    const listParams = new URLSearchParams({
      search: createVoucher.data.voucher.voucher_number,
      department: 'operations',
      category: 'travel',
      status: 'DRAFT',
      fromDate: '2026-10-11',
      toDate: '2026-10-11',
      minAmount: '1200',
      maxAmount: '1300',
      sortBy: 'amount',
      order: 'asc',
      page: '1',
      limit: '1',
    });
    const listResult = await request(`${base}/api/vouchers?${listParams}`, { headers: empHeaders });
    addResult(
      'Voucher filters and pagination',
      listResult.ok && listResult.data.total === 1 && listResult.data.data.length === 1 &&
        listResult.data.page === 1 && listResult.data.totalPages === 1,
      JSON.stringify(listResult.data)
    );

    const paginationResult = await request(`${base}/api/vouchers?page=1&limit=1&sortBy=created_at&order=DESC`, { headers: empHeaders });
    addResult(
      'Page and limit return one row',
      paginationResult.ok && paginationResult.data.data.length === 1 && paginationResult.data.totalPages >= 2,
      JSON.stringify(paginationResult.data)
    );

    const injectionParams = new URLSearchParams({ sortBy: 'amount; DROP TABLE vouchers', order: 'desc' });
    const injectionResult = await request(`${base}/api/vouchers?${injectionParams}`, { headers: empHeaders });
    addResult(
      'Sort parameters safely whitelisted',
      injectionResult.ok && Array.isArray(injectionResult.data.data),
      JSON.stringify(injectionResult.data)
    );

    const invalidOrder = await request(`${base}/api/vouchers?order=desc%3BSELECT%201`, { headers: empHeaders });
    addResult('Invalid order rejected', !invalidOrder.ok && invalidOrder.status === 400, JSON.stringify(invalidOrder.data));

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

    const crossEmployeeSearch = await request(
      `${base}/api/vouchers?${new URLSearchParams({ search: secondVoucher.data.voucher.voucher_number })}`,
      { headers: empHeaders }
    );
    addResult(
      'Employee filters cannot expose another employee voucher',
      crossEmployeeSearch.ok && crossEmployeeSearch.data.total === 0,
      JSON.stringify(crossEmployeeSearch.data)
    );

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

    const employeeDashboard = await request(`${base}/api/dashboard`, { headers: empHeaders });
    addResult(
      'Employee dashboard stats',
      employeeDashboard.ok && ['total', 'draft', 'pending', 'approved', 'rejected', 'total_amount_claimed']
        .every((key) => key in employeeDashboard.data),
      JSON.stringify(employeeDashboard.data)
    );

    const directorDashboard = await request(`${base}/api/dashboard`, { headers: directorHeaders });
    addResult(
      'Director dashboard stats and activities',
      directorDashboard.ok && ['pending_count', 'approved_today', 'rejected_today', 'total_pending_amount', 'recent_activities']
        .every((key) => key in directorDashboard.data) && directorDashboard.data.recent_activities.length <= 5,
      JSON.stringify(directorDashboard.data)
    );

    const accountsDashboard = await request(`${base}/api/dashboard`, { headers: accountsHeaders });
    addResult(
      'Accounts dashboard stats and approved vouchers',
      accountsDashboard.ok && ['total', 'pending', 'approved', 'rejected', 'total_approved_amount', 'recent_approved_vouchers']
        .every((key) => key in accountsDashboard.data) && accountsDashboard.data.recent_approved_vouchers.length <= 5,
      JSON.stringify(accountsDashboard.data)
    );

    console.log('| Test | Result |');
    console.log('| --- | --- |');
    for (const result of results) {
      console.log(`| ${result.name} | ${result.pass} |`);
    }
    const failures = results.filter((result) => result.pass === 'FAIL');
    console.log(`${results.length - failures.length}/${results.length} tests passed.`);
    if (failures.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error('SCRIPT_ERROR:', error);
    process.exit(1);
  }
})();
