import { beforeEach, describe, expect, it } from 'vitest';
import { FileSystemStore } from '../../src/storage/FileSystemStore.ts';
import { DEFAULT_FILE_NAME } from '../../src/storage/TaskStore.ts';
import { parseTaskFile, serializeTaskFile } from '../../src/schema.ts';
import { emptyTaskFile, type TaskFile } from '../../src/types.ts';
import { FakeFileHandle, FakeHandleStorage, fakePickers } from './fakeFs.ts';
import { makeTask } from './factories.ts';

const fileWith = (tasks: ReturnType<typeof makeTask>[], revision = 0): TaskFile => ({
  ...emptyTaskFile(1_800_000_000_000),
  revision,
  tasks,
});

describe('FileSystemStore', () => {
  let handle: FakeFileHandle;
  let handles: FakeHandleStorage;

  beforeEach(() => {
    handle = new FakeFileHandle(DEFAULT_FILE_NAME);
    handles = new FakeHandleStorage();
  });

  const store = (options: { remembered?: boolean } = {}) => {
    if (options.remembered) handles.handle = handle;
    return new FileSystemStore(handles, fakePickers(handle));
  };

  it('reports unsupported when the browser has no pickers', async () => {
    const unsupported = new FileSystemStore(handles, {});
    expect(unsupported.status()).toBe('unsupported');
    expect(await unsupported.init()).toBe('unsupported');
    expect(await unsupported.connect('create')).toBe('unsupported');
    expect(unsupported.describe()).toBeNull();
  });

  it('starts disconnected when no file is remembered', async () => {
    expect(await store().init()).toBe('disconnected');
  });

  it('becomes ready on init when the remembered file still has permission', async () => {
    const fs = store({ remembered: true });
    expect(await fs.init()).toBe('ready');
    expect(fs.describe()).toEqual({ name: DEFAULT_FILE_NAME });
  });

  it('needs one click when the remembered file has lost permission', async () => {
    handle.permission = 'prompt';
    const fs = store({ remembered: true });
    expect(await fs.init()).toBe('needs-permission');

    expect(await fs.connect('open')).toBe('ready');
    expect(handle.requests).toBe(1);
    // Re-granting must not open the picker again.
    expect(fs.describe()).toEqual({ name: DEFAULT_FILE_NAME });
  });

  it('stays in needs-permission when the user denies the request', async () => {
    handle.permission = 'prompt';
    handle.grantOnRequest = 'denied';
    const fs = store({ remembered: true });
    await fs.init();
    expect(await fs.connect('open')).toBe('needs-permission');
  });

  it('creates a valid empty file when creating a new one', async () => {
    const fs = store();
    expect(await fs.connect('create')).toBe('ready');
    expect(handles.handle).toBe(handle);
    const { file } = parseTaskFile(handle.text);
    expect(file.tasks).toEqual([]);
    expect(file.schemaVersion).toBe(1);
  });

  it('does not overwrite an existing file when it is picked', async () => {
    const existing = serializeTaskFile(fileWith([makeTask({ title: 'Keep me' })]));
    handle.text = existing;
    const fs = store();
    await fs.connect('open');
    expect(handle.text).toBe(existing);
    const { file } = await fs.load();
    expect(file.tasks.map((t) => t.title)).toEqual(['Keep me']);
  });

  it('does not re-ask for permission the picker already granted', async () => {
    const pickers = fakePickers(handle);
    const fs = new FileSystemStore(handles, pickers);
    expect(await fs.connect('open')).toBe('ready');
    expect(handle.requests).toBe(0);
  });

  it('remembers a picked file whose permission request is refused', async () => {
    // Chrome refuses a permission request made right after the picker, which
    // consumed the user's gesture.
    handle.permission = 'prompt';
    handle.refuseNextRequest = true;
    const pickers = fakePickers(handle);
    const fs = new FileSystemStore(handles, pickers);

    expect(await fs.connect('open')).toBe('needs-permission');
    // The file is adopted anyway, so the gate can ask for one more click.
    expect(fs.describe()).toEqual({ name: DEFAULT_FILE_NAME });
    expect(handles.handle).toBe(handle);

    // That click re-grants permission without opening the picker again.
    expect(await fs.connect('open')).toBe('ready');
    expect(pickers.opens).toBe(1);
  });

  it('creates the file once permission survives a refused request', async () => {
    handle.permission = 'prompt';
    handle.refuseNextRequest = true;
    const fs = store();

    expect(await fs.connect('create')).toBe('needs-permission');
    expect(handle.text).toBe('');

    expect(await fs.connect('open')).toBe('ready');
    const { file, problems } = await fs.load();
    expect(file.tasks).toEqual([]);
    expect(file.schemaVersion).toBe(1);
    expect(problems).toEqual([]);
    expect(JSON.parse(handle.text)).toMatchObject({ schemaVersion: 1, tasks: [] });
  });

  it('switches to another file when one is picked from the settings panel', async () => {
    const replacement = new FakeFileHandle('other-tasks.json', {
      text: serializeTaskFile(fileWith([makeTask({ title: 'In the other file' })])),
    });
    handle.text = serializeTaskFile(fileWith([makeTask({ title: 'In the first file' })]));
    handles.handle = handle;
    const fs = new FileSystemStore(handles, fakePickers(replacement));
    expect(await fs.init()).toBe('ready');

    expect(await fs.connect('pick')).toBe('ready');
    expect(fs.describe()).toEqual({ name: 'other-tasks.json' });
    expect(handles.handle).toBe(replacement);
    const { file } = await fs.load();
    expect(file.tasks.map((t) => t.title)).toEqual(['In the other file']);
    // The file left behind is untouched.
    expect(parseTaskFile(handle.text).file.tasks.map((t) => t.title)).toEqual(['In the first file']);
  });

  it('switches file even when the new one needs another click', async () => {
    const replacement = new FakeFileHandle('other-tasks.json', {
      text: serializeTaskFile(fileWith([makeTask({ title: 'In the other file' })])),
      permission: 'prompt',
    });
    replacement.refuseNextRequest = true;
    handles.handle = handle;
    const fs = new FileSystemStore(handles, fakePickers(replacement));
    await fs.init();

    expect(await fs.connect('pick')).toBe('needs-permission');
    expect(fs.describe()).toEqual({ name: 'other-tasks.json' });
    expect(await fs.connect('open')).toBe('ready');
    const { file } = await fs.load();
    expect(file.tasks.map((t) => t.title)).toEqual(['In the other file']);
  });

  it('reports problems from a hand-edited file', async () => {
    handle.text = JSON.stringify({ schemaVersion: 1, tasks: [{ title: 'No id' }] });
    const fs = store({ remembered: true });
    await fs.init();
    const { file, problems } = await fs.load();
    expect(file.tasks).toEqual([]);
    expect(problems).toHaveLength(1);
  });

  it('writes the file and bumps the revision on save', async () => {
    const fs = store({ remembered: true });
    await fs.init();
    await fs.load();

    const result = await fs.save(fileWith([makeTask({ title: 'Ship it' })]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.revision).toBe(1);
    expect(parseTaskFile(handle.text).file.tasks.map((t) => t.title)).toEqual(['Ship it']);

    const second = await fs.save(result.file);
    expect(second.ok && second.file.revision).toBe(2);
  });

  it('reports a conflict when the file changed outside the app', async () => {
    handle.text = serializeTaskFile(fileWith([makeTask({ title: 'Mine' })], 1));
    const fs = store({ remembered: true });
    await fs.init();
    const { file } = await fs.load();

    handle.editOutside(serializeTaskFile(fileWith([makeTask({ title: 'Theirs' })], 7)));

    const result = await fs.save({ ...file, tasks: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.conflict.tasks.map((t) => t.title)).toEqual(['Theirs']);
    // Nothing was written.
    expect(parseTaskFile(handle.text).file.tasks.map((t) => t.title)).toEqual(['Theirs']);
  });

  it('treats a same-revision touch as no conflict', async () => {
    handle.text = serializeTaskFile(fileWith([makeTask({ title: 'Mine' })], 4));
    const fs = store({ remembered: true });
    await fs.init();
    const { file } = await fs.load();

    // Touched (e.g. by a sync client) but the contents still match.
    handle.lastModified += 5_000;

    const result = await fs.save(file);
    expect(result.ok).toBe(true);
  });

  it('overwrite discards an outside edit', async () => {
    handle.text = serializeTaskFile(fileWith([makeTask({ title: 'Mine' })], 1));
    const fs = store({ remembered: true });
    await fs.init();
    const { file } = await fs.load();
    handle.editOutside(serializeTaskFile(fileWith([makeTask({ title: 'Theirs' })], 9)));

    const result = await fs.overwrite({ ...file, tasks: [makeTask({ title: 'Mine wins' })] });
    expect(result.ok).toBe(true);
    expect(parseTaskFile(handle.text).file.tasks.map((t) => t.title)).toEqual(['Mine wins']);
  });

  it('treats an unreadable outside edit as a conflict', async () => {
    handle.text = serializeTaskFile(fileWith([], 1));
    const fs = store({ remembered: true });
    await fs.init();
    const { file } = await fs.load();
    handle.editOutside('{ broken');

    await expect(fs.save(file)).rejects.toThrow(/not valid JSON/);
  });

  it('forgets the file on disconnect without deleting it', async () => {
    handle.text = serializeTaskFile(fileWith([makeTask({ title: 'Still on disk' })]));
    const fs = store({ remembered: true });
    await fs.init();
    await fs.disconnect();
    expect(fs.status()).toBe('disconnected');
    expect(fs.describe()).toBeNull();
    expect(handles.handle).toBeNull();
    expect(parseTaskFile(handle.text).file.tasks).toHaveLength(1);
    await expect(fs.load()).rejects.toThrow(/No task file is connected/);
  });
});
