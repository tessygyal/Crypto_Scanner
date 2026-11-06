// Tests for the safe-browsing Edge Function's pure logic. Run: npm run test:functions
// (Node runs the .ts file directly using its built-in type stripping.)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLookupBody,
  interpretLookupResponse,
  parseInput,
  THREAT_TYPES,
} from '../functions/safe-browsing/logic.ts';

describe('parseInput', () => {
  it('accepts https and http links', () => {
    assert.deepEqual(parseInput({ url: 'https://example.com/a?b=1' }), { ok: true, url: 'https://example.com/a?b=1' });
    assert.deepEqual(parseInput({ url: '  http://example.com ' }), { ok: true, url: 'http://example.com' });
  });

  it('adds http:// to a bare domain', () => {
    assert.deepEqual(parseInput({ url: 'binance-bonus.xyz/claim' }), { ok: true, url: 'http://binance-bonus.xyz/claim' });
  });

  it('rejects non-web schemes', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://example.com']) {
      assert.equal(parseInput({ url }).ok, false, url);
    }
  });

  it('rejects missing, empty, non-string and too-long values', () => {
    for (const body of [null, undefined, 'https://x.com', [], {}, { url: '' }, { url: '   ' }, { url: 42 }]) {
      assert.equal(parseInput(body).ok, false, JSON.stringify(body));
    }
    assert.equal(parseInput({ url: `https://example.com/${'a'.repeat(2048)}` }).ok, false);
  });

  it('rejects text that is not a link', () => {
    assert.equal(parseInput({ url: 'not a link at all' }).ok, false);
  });
});

describe('buildLookupBody', () => {
  it('asks about all four threat types for one URL on any platform', () => {
    const body = buildLookupBody('https://example.com');
    assert.deepEqual(body.threatInfo.threatTypes, [...THREAT_TYPES]);
    assert.deepEqual(body.threatInfo.platformTypes, ['ANY_PLATFORM']);
    assert.deepEqual(body.threatInfo.threatEntryTypes, ['URL']);
    assert.deepEqual(body.threatInfo.threatEntries, [{ url: 'https://example.com' }]);
    assert.equal(body.client.clientId, 'scam-detector-png');
  });

  it('does not contain anything that looks like a key', () => {
    assert.doesNotMatch(JSON.stringify(buildLookupBody('https://example.com')), /key/i);
  });
});

describe('interpretLookupResponse', () => {
  it('treats an empty object as not listed', () => {
    assert.deepEqual(interpretLookupResponse({}), { status: 'not_listed' });
    assert.deepEqual(interpretLookupResponse({ matches: [] }), { status: 'not_listed' });
  });

  it('returns the distinct threat types of a match', () => {
    const reply = {
      matches: [
        { threatType: 'SOCIAL_ENGINEERING', platformType: 'ANY_PLATFORM', threat: { url: 'http://x.test' }, cacheDuration: '300s' },
        { threatType: 'SOCIAL_ENGINEERING', platformType: 'WINDOWS', threat: { url: 'http://x.test' } },
        { threatType: 'MALWARE', platformType: 'ANY_PLATFORM', threat: { url: 'http://x.test' } },
      ],
    };
    assert.deepEqual(interpretLookupResponse(reply), { status: 'listed', threats: ['SOCIAL_ENGINEERING', 'MALWARE'] });
  });

  it('still reports a match whose threat type is unknown', () => {
    assert.deepEqual(interpretLookupResponse({ matches: [{ threatType: 'SOMETHING_NEW' }] }), {
      status: 'listed',
      threats: [],
    });
  });

  it('does not pass Google’s raw reply (urls, metadata) through', () => {
    const answer = interpretLookupResponse({
      matches: [{ threatType: 'MALWARE', threat: { url: 'http://x.test' }, threatEntryMetadata: { entries: [] } }],
    });
    assert.deepEqual(Object.keys(answer).sort(), ['status', 'threats']);
  });

  it('returns null for replies in the wrong shape', () => {
    for (const reply of [null, 'oops', [], { matches: 'nope' }]) {
      assert.equal(interpretLookupResponse(reply), null, JSON.stringify(reply));
    }
  });
});
