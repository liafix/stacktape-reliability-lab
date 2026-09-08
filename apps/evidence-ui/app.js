/* global document */

function requireElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing UI element: ${selector}`);
  }
  return element;
}

function setText(selector, value) {
  requireElement(selector).textContent = String(value);
}

function createScenarioRow(scenario) {
  const row = document.createElement('article');
  row.className = 'scenario-row';
  row.dataset.scenario = scenario.scenarioId;

  const identity = document.createElement('div');
  const scenarioId = document.createElement('div');
  scenarioId.className = 'scenario-id';
  scenarioId.textContent = scenario.scenarioId;
  const pass = document.createElement('span');
  pass.className = 'pass-mark';
  pass.textContent = scenario.passed ? 'PASS' : 'FAIL';
  identity.append(scenarioId, pass);

  const classification = document.createElement('div');
  classification.className = 'classification';
  classification.textContent = scenario.actual;

  const duration = document.createElement('div');
  duration.className = 'scenario-duration';
  duration.textContent = `${Math.round(scenario.durationMs)} ms`;

  const details = document.createElement('div');
  details.className = 'scenario-detail';
  details.textContent = scenario.details;

  row.append(identity, classification, duration, details);
  return row;
}

function validateEvidence(summary) {
  if (
    summary?.schemaVersion !== 1 ||
    summary?.total !== 5 ||
    summary?.passed !== 5 ||
    summary?.failed !== 0 ||
    !Array.isArray(summary?.scenarios) ||
    summary.scenarios.length !== 5
  ) {
    throw new Error('Release evidence does not satisfy the frozen P7 contract.');
  }
}

async function hydrate() {
  const [summaryResponse, releaseResponse] = await Promise.all([
    fetch('./data/evidence-summary.json'),
    fetch('./data/release.json')
  ]);

  if (!summaryResponse.ok || !releaseResponse.ok) {
    throw new Error('Unable to load release evidence.');
  }

  const summary = await summaryResponse.json();
  const release = await releaseResponse.json();

  validateEvidence(summary);

  setText('#pass-ratio', `${summary.passed}/${summary.total}`);
  setText('#schema-version', `v${summary.schemaVersion}`);
  setText('#failed-count', summary.failed);
  setText('#summary-copy', `${summary.passed}/${summary.total} scenarios matched expected classification`);

  setText('#release-status', release.evidenceStatus);
  setText('#run-id', release.p7WorkflowRunId);
  setText('#artifact-id', release.p7ArtifactId);
  setText('#evidence-commit', release.p7ImplementationCommit.slice(0, 12));
  setText('#artifact-digest', release.p7ArtifactDigest);

  const workflowLink = requireElement('#workflow-link');
  workflowLink.href = release.p7WorkflowRunUrl;

  const list = requireElement('#scenario-list');
  list.replaceChildren(...summary.scenarios.map(createScenarioRow));
}

hydrate().catch((error) => {
  const list = requireElement('#scenario-list');
  const message = document.createElement('p');
  message.className = 'error-state';
  message.textContent = `Evidence unavailable: ${String(error)}`;
  list.replaceChildren(message);
});
