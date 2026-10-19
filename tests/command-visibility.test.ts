import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PermissionFlagsBits } from 'discord.js';
import { PingCommand } from '../src/presentation/discord/commands/ping.command.js';
import { LogsCommand } from '../src/presentation/discord/commands/logs.command.js';

describe('Discord Commands - Administrator Visibility & Default Member Permissions', () => {
  const pingCommand = new PingCommand();
  const logsCommand = new LogsCommand(null as never, []);

  it('should restrict /ping visibility to administrators only', () => {
    assert.equal(
      pingCommand.data.default_member_permissions,
      PermissionFlagsBits.Administrator.toString()
    );
    assert.equal(pingCommand.data.toJSON().default_member_permissions, '8');
  });

  it('should restrict /logs visibility to administrators only', () => {
    assert.equal(
      logsCommand.data.default_member_permissions,
      PermissionFlagsBits.Administrator.toString()
    );
    assert.equal(logsCommand.data.toJSON().default_member_permissions, '8');
  });
});
