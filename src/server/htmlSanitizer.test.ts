import { describe, it, expect } from 'vitest';
import { sanitizeRichText } from './htmlSanitizer.js';

describe('sanitizeRichText', () => {
  it('keeps allowed formatting tags', () => {
    expect(sanitizeRichText('<p>hello <strong>world</strong></p>')).toBe('<p>hello <strong>world</strong></p>');
    expect(sanitizeRichText('<ul><li>a</li><li>b</li></ul>')).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('removes <script> together with its content', () => {
    expect(sanitizeRichText('<script>alert(1)</script>')).toBe('');
    expect(sanitizeRichText('before<script>alert(1)</script>after')).toBe('beforeafter');
  });

  it('removes <style>, <iframe> and other dangerous elements with content', () => {
    expect(sanitizeRichText('<p>ok</p><style>body{}</style><p>ok2</p>')).toBe('<p>ok</p><p>ok2</p>');
    expect(sanitizeRichText('<iframe src="evil"></iframe>text')).toBe('text');
  });

  it('is case-insensitive for dangerous tags', () => {
    expect(sanitizeRichText('<SCRIPT>alert(1)</SCRIPT>')).toBe('');
  });

  it('strips event-handler and other attributes from allowed tags', () => {
    expect(sanitizeRichText('<p onclick="evil()">x</p>')).toBe('<p>x</p>');
    expect(sanitizeRichText('<span style="color:red">y</span>')).toBe('<span>y</span>');
  });

  it('strips disallowed tags but keeps their text', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">link</a>')).toBe('link');
    expect(sanitizeRichText('<div><span>keep</span></div>')).toBe('<span>keep</span>');
  });

  it('removes <img> entirely (disallowed, self-closing)', () => {
    expect(sanitizeRichText('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('removes orphan opening tag of a dangerous element', () => {
    expect(sanitizeRichText('<p>unclosed <script>alert(1)')).toBe('<p>unclosed alert(1)');
  });

  it('removes HTML comments', () => {
    expect(sanitizeRichText('<!-- secret --><p>after</p>')).toBe('<p>after</p>');
  });

  it('normalizes self-closing <br/> to <br>', () => {
    expect(sanitizeRichText('<p>a<br/>b</p>')).toBe('<p>a<br>b</p>');
  });

  it('returns empty string for non-string or empty input', () => {
    expect(sanitizeRichText('')).toBe('');
    expect(sanitizeRichText(undefined)).toBe('');
    expect(sanitizeRichText(null)).toBe('');
    expect(sanitizeRichText(123)).toBe('');
  });

  it('leaves plain text untouched', () => {
    expect(sanitizeRichText('plain text no tags')).toBe('plain text no tags');
  });
});
