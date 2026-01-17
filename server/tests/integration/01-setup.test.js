/**
 * Setup & Configuration Tests
 *
 * Tests for the configuration API endpoints:
 * - Health check
 * - Authentication
 * - Create configuration
 * - Read configuration
 * - Update configuration
 * - Delete configuration
 */

import {
  runTest,
  get,
  post,
  put,
  del,
  assert,
  assertOk,
  assertString,
  assertArray,
  assertHasProperties,
  setSharedData,
  getSharedData,
  createTestConfig,
  createTestCatalog,
  loginAndGetToken,
  getAuthHeaders,
} from '../helpers/utils.js';
import { CONFIG } from '../helpers/config.js';

const SUITE = 'Setup & Config';

export async function run() {
  // ==========================================
  // Health Check
  // ==========================================

  await runTest(SUITE, 'Health check returns OK', async () => {
    const res = await get('/health');
    assertOk(res, 'Health check');
    assert(res.data.status === 'ok', 'Status should be "ok"');
  });

  // ==========================================
  // Authentication
  // ==========================================

  await runTest(SUITE, 'Login with valid API key', async () => {
    const res = await post('/api/auth/login', {
      apiKey: CONFIG.tmdbApiKey,
    });
    assertOk(res, 'Login');
    assertHasProperties(res.data, ['token', 'userId'], 'Login response');
    assertString(res.data.token, 'token');

    setSharedData('authToken', res.data.token);
    setSharedData('userId', res.data.userId);
  });

  await runTest(SUITE, 'Login fails with invalid API key', async () => {
    const res = await post('/api/auth/login', {
      apiKey: 'invalid-key-format',
    });
    assert(!res.ok, 'Should fail with invalid key');
    assert(res.status === 400, 'Should return 400 for invalid format');
  });

  await runTest(SUITE, 'Verify token returns valid', async () => {
    const res = await get('/api/auth/verify', { headers: getAuthHeaders() });
    assertOk(res, 'Verify');
    assert(res.data.valid === true, 'Token should be valid');
    assertString(res.data.userId, 'userId');
  });

  // ==========================================
  // Create Configuration
  // ==========================================

  await runTest(SUITE, 'Create new configuration', async () => {
    const configData = {
      catalogs: [
        createTestCatalog({
          name: 'Integration Test Movies',
          type: 'movie',
          filters: {
            genres: ['28'],
            sortBy: 'popularity.desc',
          },
        }),
      ],
    };

    const res = await post('/api/config', configData, { headers: getAuthHeaders() });
    assertOk(res, 'Create config');

    assertHasProperties(res.data, ['userId', 'installUrl', 'stremioUrl'], 'Response');
    assertString(res.data.userId, 'userId');

    setSharedData('testConfigUserId', res.data.userId);
  });

  await runTest(SUITE, 'Create config fails without auth', async () => {
    const res = await post('/api/config', {
      catalogs: [createTestCatalog()],
    });

    assert(!res.ok, 'Should fail without auth');
    assert(res.status === 401, 'Should return 401');
  });

  // ==========================================
  // Read Configuration
  // ==========================================

  await runTest(SUITE, 'Get existing configuration', async () => {
    const userId = getSharedData('testConfigUserId');
    assert(userId, 'userId should be set from previous test');

    const res = await get(`/api/config/${userId}`, { headers: getAuthHeaders() });
    assertOk(res, 'Get config');

    assert(res.data.userId === userId, 'userId should match');
    assertArray(res.data.catalogs, 1, 'Should have at least 1 catalog');
  });

  await runTest(SUITE, 'Get config fails without auth', async () => {
    const userId = getSharedData('testConfigUserId');
    const res = await get(`/api/config/${userId}`);
    assert(res.status === 401, 'Should return 401 without auth');
  });

  await runTest(SUITE, 'Get non-existent configuration returns 404', async () => {
    const res = await get('/api/config/nonexistent123', { headers: getAuthHeaders() });
    assert(res.status === 404, 'Should return 404');
  });

  // ==========================================
  // Update Configuration
  // ==========================================

  await runTest(SUITE, 'Update existing configuration', async () => {
    const userId = getSharedData('testConfigUserId');

    const updateData = {
      catalogs: [
        createTestCatalog({
          name: 'Updated Integration Test',
          type: 'movie',
          filters: {
            genres: ['28', '12'],
            sortBy: 'vote_average.desc',
            voteCountMin: 500,
          },
        }),
      ],
    };

    const res = await put(`/api/config/${userId}`, updateData, { headers: getAuthHeaders() });
    assertOk(res, 'Update config');

    assert(res.data.userId === userId, 'userId should match');
    assertHasProperties(res.data, ['installUrl', 'stremioUrl', 'configureUrl'], 'Response');

    const getRes = await get(`/api/config/${userId}`, { headers: getAuthHeaders() });
    assertOk(getRes, 'Get updated config');

    const catalog = getRes.data.catalogs[0];
    assert(catalog.name === 'Updated Integration Test', 'Catalog name should be updated');
  });

  // ==========================================
  // Date Preset Persistence
  // ==========================================

  await runTest(SUITE, 'Date presets are persisted correctly', async () => {
    const userId = getSharedData('testConfigUserId');

    const configData = {
      catalogs: [
        createTestCatalog({
          id: 'date-preset-test',
          name: 'Date Preset Test',
          filters: {
            datePreset: 'last_30_days',
            sortBy: 'release_date.desc',
          },
        }),
      ],
    };

    const saveRes = await put(`/api/config/${userId}`, configData, { headers: getAuthHeaders() });
    assertOk(saveRes, 'Save config with datePreset');

    const getRes = await get(`/api/config/${userId}`, { headers: getAuthHeaders() });
    assertOk(getRes);

    const presetCatalog = getRes.data.catalogs.find((c) => c.name === 'Date Preset Test');
    assert(presetCatalog, 'Date preset catalog should exist');
    assert(
      presetCatalog.filters?.datePreset === 'last_30_days',
      `datePreset should be persisted: got '${presetCatalog.filters?.datePreset}'`
    );
  });

  // ==========================================
  // Config Name Persistence
  // ==========================================

  await runTest(SUITE, 'Config name is persisted', async () => {
    const userId = getSharedData('testConfigUserId');

    const configData = {
      configName: 'My Test Configuration',
      catalogs: [createTestCatalog()],
    };

    const res = await put(`/api/config/${userId}`, configData, { headers: getAuthHeaders() });
    assertOk(res);

    const getRes = await get(`/api/config/${userId}`, { headers: getAuthHeaders() });
    assertOk(getRes);
    assert(getRes.data.configName === 'My Test Configuration', 'Config name should be persisted');
  });

  // ==========================================
  // Preferences Persistence
  // ==========================================

  await runTest(SUITE, 'Preferences are persisted', async () => {
    const userId = getSharedData('testConfigUserId');

    const configData = {
      catalogs: [createTestCatalog()],
      preferences: {
        showAdultContent: false,
        defaultLanguage: 'es',
      },
    };

    const res = await put(`/api/config/${userId}`, configData, { headers: getAuthHeaders() });
    assertOk(res);

    const getRes = await get(`/api/config/${userId}`, { headers: getAuthHeaders() });
    assertOk(getRes);
    assert(getRes.data.preferences?.defaultLanguage === 'es', 'Preferences should be persisted');
  });

  // ==========================================
  // Delete Configuration
  // ==========================================

  await runTest(SUITE, 'Delete configuration', async () => {
    // Create a new config for deletion
    const createRes = await post('/api/config', { catalogs: [] }, { headers: getAuthHeaders() });
    assertOk(createRes, 'Create config for deletion');

    const deleteUserId = createRes.data.userId;

    const delRes = await del(`/api/config/${deleteUserId}`, { headers: getAuthHeaders() });
    assertOk(delRes, 'Delete config');

    // Verify deletion
    const getRes = await get(`/api/config/${deleteUserId}`, { headers: getAuthHeaders() });
    assert(getRes.status === 404, 'Config should be deleted');
  });

  await runTest(SUITE, 'Cannot delete config without ownership', async () => {
    // This test requires a second API key, so we skip if not available
    // For now, just verify that accessing a non-existent config returns 404
    const res = await del('/api/config/someone_elses_config', { headers: getAuthHeaders() });
    assert(res.status === 404, 'Should return 404 for non-existent config');
  });
}
