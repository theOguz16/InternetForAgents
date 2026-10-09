'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
const datasetPath = path.join(ROOT, 'training', 'examples.jsonl');
const htmlPath = path.join(ROOT, 'index.html');
const modelPath = path.join(ROOT, 'training', 'planner-model.json');
const K = 5;
const THRESHOLD = 0.30;

function features(text) {
  const words = (text.toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu) || []).filter(w => w.length > 1);
  const out = new Set(words.map(w => `w:${w}`));
  for (const word of words) for (let i = 0; i <= word.length - 3; i++) out.add(`c:${word.slice(i, i + 3)}`);
  return [...out];
}
function parseDataset() {
  return fs.readFileSync(datasetPath, 'utf8').split(/\r?\n/).filter(Boolean).map((line, i) => {
    try {
      const row = JSON.parse(line);
      if (typeof row.text !== 'string' || !Array.isArray(row.labels) || !row.labels.length) throw new Error('text/labels required');
      return { text: row.text, labels: row.labels };
    } catch (error) { throw new Error(`examples.jsonl:${i + 1}: ${error.message}`); }
  });
}
function train(rows) {
  const labels = [...new Set(rows.flatMap(row => row.labels))].sort();
  const raw = rows.map(row => ({ labels: row.labels, features: features(row.text) }));
  const df = new Map();
  for (const row of raw) for (const feature of row.features) df.set(feature, (df.get(feature) || 0) + 1);
  const idf = Object.fromEntries([...df].map(([feature, count]) => [feature, Number((Math.log((rows.length + 1) / (count + 1)) + 1).toFixed(5))]));
  const documents = raw.map(row => {
    const vector = row.features.map(feature => [feature, idf[feature]]);
    const norm = Math.sqrt(vector.reduce((sum, pair) => sum + pair[1] * pair[1], 0));
    return { labels: row.labels, norm: Number(norm.toFixed(5)), vector };
  });
  return { algorithm: 'tfidf-knn-multilabel', threshold: THRESHOLD, k: K, trainingExamples: rows.length, labels, idf, documents };
}
function predict(model, text) {
  const input = new Map(features(text).filter(feature => model.idf[feature]).map(feature => [feature, model.idf[feature]]));
  const norm = Math.sqrt([...input.values()].reduce((sum, value) => sum + value * value, 0)) || 1;
  const neighbors = model.documents.map(doc => {
    let dot = 0;
    for (const [feature, value] of doc.vector) dot += value * (input.get(feature) || 0);
    return { labels: doc.labels, similarity: dot / (norm * doc.norm) };
  }).filter(doc => doc.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, model.k);
  const total = neighbors.reduce((sum, row) => sum + row.similarity, 0) || 1;
  const scores = Object.fromEntries(model.labels.map(label => [label, neighbors.reduce((sum, row) => sum + (row.labels.includes(label) ? row.similarity : 0), 0) / total]));
  let labels = model.labels.filter(label => scores[label] >= model.threshold);
  if (!labels.length && model.labels.length) labels = [model.labels.sort((a, b) => scores[b] - scores[a])[0]];
  return { labels, scores };
}
function hash(value) { let h = 2166136261; for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function evaluate(rows) {
  const shuffled = [...rows].sort((a, b) => hash(a.text) - hash(b.text));
  const test = shuffled.filter((_, i) => i % 5 === 0), trainRows = shuffled.filter((_, i) => i % 5 !== 0), model = train(trainRows);
  let tp = 0, fp = 0, fn = 0;
  for (const row of test) {
    const actual = new Set(row.labels), predicted = new Set(predict(model, row.text).labels);
    for (const label of predicted) actual.has(label) ? tp++ : fp++;
    for (const label of actual) if (!predicted.has(label)) fn++;
  }
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);
  return { holdoutExamples: test.length, precision: Number(precision.toFixed(3)), recall: Number(recall.toFixed(3)), microF1: Number((2 * precision * recall / Math.max(0.0001, precision + recall)).toFixed(3)) };
}
const rows = parseDataset(), metrics = evaluate(rows), model = { ...train(rows), holdout: metrics, trainedAt: new Date().toISOString() };
fs.writeFileSync(modelPath, JSON.stringify(model, null, 2) + '\n', 'utf8');
let html = fs.readFileSync(htmlPath, 'utf8');
const marker = /const LEARNED_PLANNER_MODEL = (?:\/\*TRAINED_MODEL\*\/ )?.*?;/;
if (!marker.test(html)) throw new Error('Trained model assignment not found in index.html');
html = html.replace(marker, `const LEARNED_PLANNER_MODEL = ${JSON.stringify(model)};`);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`Planner eğitildi: ${rows.length} örnek, ${model.labels.length} capability`);
console.log(`Holdout micro-F1 ${metrics.microF1} (precision ${metrics.precision}, recall ${metrics.recall})`);
console.log(`Model kaydedildi: ${path.relative(ROOT, modelPath)}`);
