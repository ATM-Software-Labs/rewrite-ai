import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText, BANNED_PHRASES_ES, BANNED_PHRASES_EN } from '../functions/lib/aiDictionary.js';

test('sanitizeText strips semicolons and air quotes', () => {
  const input = 'Antes de invertir, revisa siempre el balance; evita una "multinacional" débil.';
  const output = sanitizeText(input, false);
  assert.ok(!output.includes(';'), 'Should not contain semicolons');
  assert.ok(!output.includes('"multinacional"'), 'Should not contain air quotes around single words');
  assert.ok(output.includes('multinacional'), 'Should contain unquoted word');
  assert.ok(output.includes('. Evita'), 'Should capitalise sentence after semicolon removal');
});

test('sanitizeText strips trailing relative consequence clauses', () => {
  const input = 'Las empresas operan en varios países, lo que las protege de las caídas de divisas.';
  const output = sanitizeText(input, false);
  assert.ok(!output.includes(', lo que las protege'), 'Should eliminate relative consequence clause');
  assert.ok(output.includes('. Así las protege') || output.includes('sobresaltos') || output.includes('caídas'), 'Should transform smoothly');
});

test('sanitizeText replaces corporate AI clichés', () => {
  const input = 'Analiza el desglose geográfico y los vaivenes políticos y de divisas de las verdaderas corporaciones globales con fuentes de ingresos diversificadas.';
  const output = sanitizeText(input, false);
  assert.ok(!output.toLowerCase().includes('desglose geográfico'));
  assert.ok(!output.toLowerCase().includes('vaivenes políticos y de divisas'));
  assert.ok(!output.toLowerCase().includes('verdaderas corporaciones globales'));
  assert.ok(!output.toLowerCase().includes('fuentes de ingresos diversificadas'));
});

test('sanitizeText strips AI preambles and markdown fences', () => {
  const input = '¡Por supuesto! Aquí tienes el texto:\n\n"""Texto limpio sin rodeos."""';
  const output = sanitizeText(input, false);
  assert.equal(output, 'Texto limpio sin rodeos.');
});

test('Banned lists are populated', () => {
  assert.ok(BANNED_PHRASES_ES.length > 30);
  assert.ok(BANNED_PHRASES_EN.length > 30);
});
