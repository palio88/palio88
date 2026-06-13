// Tests for export utility — mocking expo-file-system and expo-sharing

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache/test.stl' }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as Sharing from 'expo-sharing';
import { exportFile } from '../../lib/export';

describe('exportFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls shareAsync with correct mime for STL', async () => {
    await exportFile('http://example.com/output.stl', 'stl', 'Simple Box');
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/simple_box.stl',
      expect.objectContaining({ mimeType: 'model/stl' }),
    );
  });

  it('calls shareAsync with correct mime for 3MF', async () => {
    await exportFile('http://example.com/output.3mf', '3mf', 'Phone Stand');
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/phone_stand.3mf',
      expect.objectContaining({ mimeType: 'model/3mf' }),
    );
  });

  it('throws when sharing is unavailable', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await expect(exportFile('http://example.com/output.stl', 'stl', 'Box')).rejects.toThrow(
      'Sharing is not available',
    );
  });
});
