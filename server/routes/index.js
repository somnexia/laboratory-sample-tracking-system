'use strict';

const express = require('express');
const router = express.Router();
const { SAMPLE_TYPES } = require('../config/sampleTypes');
const { SAMPLE_STATUSES, ALLOWED_TRANSITIONS, DEFAULT_STATUS } = require('../config/sampleStatuses');
const { EVENT_ACTIONS } = require('../config/sampleEvents');

router.get('/health', function getHealth(req, res) {
  res.json({ status: 'ok' });
});

router.get('/api', function getApiIndex(req, res) {
  res.json({
    name: 'Laboratory Sample Tracking API',
    version: '0.0.0',
    documentation: '/api-docs (Swagger will be added later)',
    contract: '/docs in repository: docs/api-contract.md',
    enums: {
      sample_types: SAMPLE_TYPES,
      sample_statuses: SAMPLE_STATUSES,
      default_status: DEFAULT_STATUS,
      allowed_transitions: ALLOWED_TRANSITIONS,
      event_actions: EVENT_ACTIONS,
    },
    endpoints: {
      health: { method: 'GET', path: '/health', access: 'public' },
      auth: [
        { method: 'POST', path: '/auth/register', access: 'public' },
        { method: 'POST', path: '/auth/login', access: 'public' },
        { method: 'GET', path: '/auth/me', access: 'authenticated' },
      ],
      samples: [
        { method: 'POST', path: '/samples', access: 'authenticated' },
        { method: 'GET', path: '/samples', access: 'public', query: ['country', 'type', 'status', 'sort'] },
        { method: 'GET', path: '/samples/:id', access: 'public' },
        { method: 'PUT', path: '/samples/:id', access: 'owner' },
        { method: 'DELETE', path: '/samples/:id', access: 'owner' },
        { method: 'PATCH', path: '/samples/:id/status', access: 'owner' },
        { method: 'GET', path: '/samples/:id/history', access: 'public' },
      ],
      documents: [
        { method: 'POST', path: '/samples/:id/documents', access: 'authenticated' },
        { method: 'GET', path: '/samples/:id/documents', access: 'public' },
        { method: 'DELETE', path: '/documents/:id', access: 'owner' },
      ],
      ratings: [
        { method: 'POST', path: '/samples/:id/ratings', access: 'authenticated' },
        { method: 'GET', path: '/samples/:id/rating', access: 'public' },
        { method: 'GET', path: '/samples/:id/ratings', access: 'public' },
        { method: 'PUT', path: '/ratings/:id', access: 'owner' },
        { method: 'DELETE', path: '/ratings/:id', access: 'owner' },
      ],
    },
  });
});

module.exports = router;
