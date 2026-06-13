import { act, renderHook } from '@testing-library/react-hooks';
import { useDesignStore } from '../../stores/design.store';
import type { Template } from '../../lib/types';

// Reset store state between tests
beforeEach(() => {
  useDesignStore.setState({
    activeTemplate: null,
    params: {},
    lastGeneration: null,
    savedDesigns: [],
    isGenerating: false,
    generationError: null,
  });
});

const mockTemplate: Template = {
  id: 'simple_box',
  name: 'Simple Box',
  category: 'storage',
  description: 'Test template',
  thumbnail: 'simple_box.png',
  tags: ['test'],
  free: true,
  params: {
    width:  { type: 'range', min: 50, max: 300, default: 100, unit: 'mm', label: 'Width' },
    has_lid: { type: 'bool', default: false, label: 'Add Lid' },
    text:   { type: 'text', default: 'Hello', label: 'Text' },
  },
};

describe('useDesignStore', () => {
  it('sets active template and populates default params', () => {
    const { result } = renderHook(() => useDesignStore());
    act(() => { result.current.setActiveTemplate(mockTemplate); });

    expect(result.current.activeTemplate?.id).toBe('simple_box');
    expect(result.current.params.width).toBe(100);
    expect(result.current.params.has_lid).toBe(false);
    expect(result.current.params.text).toBe('Hello');
  });

  it('updateParam changes a single param without touching others', () => {
    const { result } = renderHook(() => useDesignStore());
    act(() => { result.current.setActiveTemplate(mockTemplate); });
    act(() => { result.current.updateParam('width', 200); });

    expect(result.current.params.width).toBe(200);
    expect(result.current.params.has_lid).toBe(false);
  });

  it('resetParams restores defaults', () => {
    const { result } = renderHook(() => useDesignStore());
    act(() => { result.current.setActiveTemplate(mockTemplate); });
    act(() => { result.current.updateParam('width', 250); });
    act(() => { result.current.resetParams(); });

    expect(result.current.params.width).toBe(100);
  });

  it('clears generationError when setActiveTemplate is called', () => {
    useDesignStore.setState({ generationError: 'previous error' });
    const { result } = renderHook(() => useDesignStore());
    act(() => { result.current.setActiveTemplate(mockTemplate); });

    expect(result.current.generationError).toBeNull();
  });

  it('setSavedDesigns populates the list', () => {
    const { result } = renderHook(() => useDesignStore());
    const designs = [
      {
        id: 'd1', user_id: 'u1', template_id: 'simple_box', template_name: 'Simple Box',
        params: {}, stl_url: null, glb_url: null,
        created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
      },
    ];
    act(() => { result.current.setSavedDesigns(designs); });

    expect(result.current.savedDesigns).toHaveLength(1);
    expect(result.current.savedDesigns[0].id).toBe('d1');
  });
});
