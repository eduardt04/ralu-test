// Handles the 'Rezultate teste' pane
export async function initResultsPane(mainContent) {
  mainContent.innerHTML = `<div class="results-pane">
    <h2>Rezultatele testelor tale</h2>
    <div id="results-list">Se încarcă...</div>
  </div>`;
  const user = firebase.auth().currentUser;
  if (!user) {
    document.getElementById('results-list').innerHTML = '<div>Trebuie să fii autentificat pentru a vedea rezultatele testelor.</div>';
    return;
  }
  // Fetch tests from Firestore
  const snapshot = await firebase.firestore()
    .collection('generated_tests')
    .where('user', '==', user.uid)
    .orderBy('created', 'desc')
    .get();
  if (snapshot.empty) {
    document.getElementById('results-list').innerHTML = '<div>Nu ai niciun test generat până acum.</div>';
    return;
  }
  const tests = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id;
    tests.push(data);
  });
  // Render test list
  document.getElementById('results-list').innerHTML = `<ul class="test-results-list">
    ${tests.map((test, idx) => {
      const date = test.created && test.created.toDate ? test.created.toDate() : (test.created instanceof Date ? test.created : new Date(test.created));
      const dateStr = date.toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' });
      return `<li class="test-result-item" data-test-id="${test.id}" style="cursor:pointer;padding:1rem 0;border-bottom:1px solid #333;">
        <b>Test #${tests.length - idx}</b> &mdash; <span style="color:#4f46e5">${dateStr}</span><br/>
        Întrebări: <b>${test.numQuestions}</b>
      </li>`;
    }).join('')}
  </ul>`;
  // Click handler to show test details
  document.querySelectorAll('.test-result-item').forEach(item => {
    item.addEventListener('click', function() {
      const testId = this.getAttribute('data-test-id');
      const test = tests.find(t => t.id === testId);
      if (test) renderTestDetails(test);
    });
  });

  function renderTestDetails(test) {
    // Parse userAnswers from string to array
    const userAnswers = (test.userAnswers || []).map(ans => (typeof ans === 'string' ? ans.split('|||').map(s => s.trim().toLowerCase()).filter(Boolean) : []));
    const score = test.score || null;
    mainContent.innerHTML = `<div class="test-details-pane">
      <button id="backToResults" style="margin-bottom:1.5rem;">&larr; Înapoi la rezultate</button>
      <h2>Detalii test</h2>
      <div style="margin-bottom:1rem;">Data: <b>${(test.created && test.created.toDate ? test.created.toDate() : (test.created instanceof Date ? test.created : new Date(test.created))).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' })}</b></div>
      <div style="margin-bottom:1rem;">Întrebări: <b>${test.numQuestions}</b></div>
      ${score ? `<div class='score' style='margin-bottom:1rem;'>Scor: <b>${score.correct} / ${score.total}</b> (${score.percent}%)</div>` : ''}
      <div class="scrollable-questions">
        ${test.questions.map((q, idx) => {
          const isMultiple = (q["Răspunsuri"] || []).length > 1;
          let questionText = q["Întrebare răspuns simplu"] || q["Întrebare răspuns multiplu"] || q["întrebare răspuns simplu"] || q["întrebare răspuns multiplu"] || '';
          questionText = questionText.replace(/^\s*\d+\.?\s*/, '');
          let options = (q.Variante || []).slice();
          // Don't shuffle for review
          const normalize = v => String(v).replace(/^\s*[A-Ea-e]\.[ ]?/, '').trim().toLowerCase();
          const correctAnswers = (q["Răspunsuri"] || []).map(normalize);
          const userAns = userAnswers[idx] || [];
          return `<div class="questionnaire" style="max-width:900px;margin:1.5rem auto;">
            <div class="question-number">Întrebarea ${idx + 1} din ${test.questions.length}</div>
            <div class="question-text">${questionText}</div>
            <div class="options">
              ${options.map(opt => {
                const val = normalize(opt);
                let style = '';
                if (correctAnswers.includes(val) && userAns.includes(val)) style = 'background:#b3e6ff;'; // both correct and selected
                else if (correctAnswers.includes(val)) style = 'background:#c6f7d0;'; // correct only
                else if (userAns.includes(val)) style = 'background:#ffd6d6;'; // selected but wrong
                return `<span class="option-label" style="${style}">${opt.replace(/^\s*[A-Ea-e]\.[ ]?/, '').trim()}</span>`;
              }).join('')}
            </div>
            <div class="pagina"><b>Pagina:</b> ${(q['partition'] ? (q['partition'].match(/^([\d]+)/) || [])[1] : (q['pagina'] || 'N/A'))}</div>
            <div class="sursa"><b>Sursa:</b> ${q['Sursa'] || ''}</div>
            <div class="capitol"><b>Capitol:</b> ${q['Capitol'] || ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
    document.getElementById('backToResults').onclick = () => initResultsPane(mainContent);
  }
}
