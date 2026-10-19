import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Result } from '../src/shared/core/Result.js';
import { DiscordId } from '../src/domain/user/value-objects/DiscordId.js';
import { UserProfile } from '../src/domain/user/entities/UserProfile.js';
import { BackendUserGateway } from '../src/infrastructure/backend/BackendUserGateway.js';
import { HttpClient } from '../src/infrastructure/http/HttpClient.js';
import { GetUserProfileUseCase } from '../src/application/user/use-cases/GetUserProfileUseCase.js';

describe('Shared Core - Result Pattern', () => {
  it('should create a successful result with value', () => {
    const res = Result.ok<number, Error>(42);
    assert.equal(res.isSuccess, true);
    assert.equal(res.isFailure, false);
    assert.equal(res.getValue(), 42);
  });

  it('should create a failed result with error', () => {
    const error = new Error('Test error');
    const res = Result.fail<number, Error>(error);
    assert.equal(res.isSuccess, false);
    assert.equal(res.isFailure, true);
    assert.equal(res.getError(), error);
  });

  it('should map successful result', () => {
    const res = Result.ok<number, Error>(10).map((v) => v * 2);
    assert.equal(res.getValue(), 20);
  });
});

describe('Domain Layer - Value Objects & Entities', () => {
  it('should validate Discord snowflake IDs', () => {
    const valid = DiscordId.create('123456789012345678');
    assert.equal(valid.isSuccess, true);
    assert.equal(valid.getValue().value, '123456789012345678');

    const invalidShort = DiscordId.create('12345');
    assert.equal(invalidShort.isFailure, true);

    const invalidAlpha = DiscordId.create('abcdef123456789012');
    assert.equal(invalidAlpha.isFailure, true);
  });

  it('should manage UserProfile entity invariants', () => {
    const discordId = DiscordId.create('987654321098765432').getValue();
    const profile = UserProfile.create('u-1', {
      discordId,
      username: 'TestPilot',
      bio: 'Initial Bio',
      level: 1,
    });

    assert.equal(profile.bio, 'Initial Bio');
    assert.equal(profile.level, 1);

    profile.incrementLevel();
    assert.equal(profile.level, 2);
  });
});

describe('Application Layer - Use Cases with Mock Gateway', () => {
  const httpClient = new HttpClient({ baseUrl: 'http://localhost:3000' });
  const mockGateway = new BackendUserGateway({ httpClient, useMockBackend: true });
  const getProfileUseCase = new GetUserProfileUseCase(mockGateway);

  const testDiscordId = '123456789012345678';

  it('should fetch user profile through GetUserProfileUseCase', async () => {
    const result = await getProfileUseCase.execute({ discordId: testDiscordId });
    assert.equal(result.isSuccess, true);

    const dto = result.getValue();
    assert.equal(dto.discordId, testDiscordId);
    assert.ok(dto.username);
  });

  it('should reject invalid input at application boundary', async () => {
    const result = await getProfileUseCase.execute({ discordId: 'too-short' });
    assert.equal(result.isFailure, true);
  });
});
