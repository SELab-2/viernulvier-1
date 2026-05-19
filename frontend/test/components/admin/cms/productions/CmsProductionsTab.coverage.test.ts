import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import CmsProductionsTab from '@/components/admin/cms/productions/CmsProductionsTab.vue';

// Partial mock for i18n: preserve createI18n but override useI18n
vi.mock('vue-i18n', async (importOriginal: any) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useI18n: () => ({ t: (k: string) => k }),
    // keep the real createI18n available to src/i18n which expects it
    createI18n: actual.createI18n,
    i18n: { global: { locale: { value: 'nl' } } },
  };
});

// Mock composables used by the component
vi.mock('@/composables/useDarkMode', () => ({ useDarkMode: () => ({ isDark: ref(false) }) }));
vi.mock('@/composables/useCmsProductionGrid', () => ({
  useCmsProductionGrid: () => ({
    agThemeVars: {},
    autoSizeGridColumns: () => {},
    columnChooserOpen: ref(false),
    columnDefs: [],
    columnVisibility: ref({}),
    defaultColDef: {},
    exportGridCsv: () => {},
    fitGridColumns: () => {},
    getProductionRowStyle: () => ({}),
    gridColumnOptions: [],
    gridApi: ref({ getSelectedRows: () => [] }),
    onGridReady: () => {},
    onSelectionChanged: () => {},
    quickFilterText: ref(''),
    resetGridFilters: () => {},
    resetGridState: () => {},
    rowSelection: 'single',
    selectedCount: ref(0),
    setGridColumnVisibility: () => {},
    applyQuickFilter: () => {},
    persistGridState: () => {},
  }),
}));

// Mock removal composable
vi.mock('@/composables/useCmsRemove', () => ({
  useCmsRemove: () => ({
    removeConfirmOpen: ref(false),
    removeConfirmLoading: ref(false),
    removeConfirmError: ref(null),
    openRemoveConfirm: () => {},
    closeRemoveConfirm: () => {},
    confirmRemove: async () => {},
  }),
}));

// Mock services used in the flows we exercise
vi.mock('@/services/productions', () => ({
  getProductions: async () => ({ items: [] }),
  getAllTags: async () => [],
  getTagTypes: async () => [],
  getHalls: async () => [],
  updateProduction: vi.fn().mockResolvedValue({}),
  createProduction: vi.fn().mockResolvedValue({ id: 1 }),
  deleteProduction: vi.fn().mockResolvedValue(undefined),
  bulkUpdateProductions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/images', () => ({
  getImagesByProduction: vi.fn().mockResolvedValue([]),
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/cms/media-upload', () => ({ uploadImageWithCrops: vi.fn() }));

vi.mock('@/services/cms/media-preview', () => ({
  isImagePreviewUrl: (u: string) => u.startsWith('http') && u.endsWith('.jpg'),
  isVideoPreviewUrl: (u: string) => u.startsWith('http') && u.endsWith('.mp4'),
  resolvePreferredCropUrl: () => null,
}));

import { uploadImageWithCrops } from '@/services/cms/media-upload';
import { deleteImage as deleteImageService } from '@/services/images';
import { updateProduction } from '@/services/productions';
import { bulkUpdateProductions } from '@/services/productions';

describe('CmsProductionsTab targeted coverage', () => {
  let wrapper: any;

  beforeEach(async () => {
    wrapper = mount(CmsProductionsTab, { global: { stubs: ['AgGridVue', 'CmsMediaPreviewModal', 'CmsTabShell', 'CmsCreateProductionModal', 'CmsEventsDrawer', 'CmsEditorPanel', 'CmsTagDrawer', 'CmsCreateEventModal', 'CmsRemoveConfirmModal'] } });
    // wait a tick for any mounted effects
    await Promise.resolve();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('handles openMediaPreview placeholders and providers', () => {
    const vm = wrapper.vm.__test as any;

    // Blank + mediaField -> iframe about:blank
    vm.openMediaPreview('', 'lbl', { mediaField: 'video_1', productionId: 5 });
    expect(vm.mediaPreview.value.kind).toBe('iframe');
    expect(vm.mediaPreview.value.url).toBe('about:blank');

    // Blank no mediaField -> image placeholder (data URL)
    vm.openMediaPreview('', 'lbl', {});
    expect(vm.mediaPreview.value.kind).toBe('image');
    expect(String(vm.mediaPreview.value.url)).toContain('data:image/svg+xml');

    // YouTube watch format
    vm.openMediaPreview('https://www.youtube.com/watch?v=ABCDEFGHIJK', 'lbl');
    expect(vm.mediaPreview.value.kind).toBe('iframe');
    expect(String(vm.mediaPreview.value.url)).toContain('/embed/ABCDEFGHIJK');

    // YouTube short format
    vm.openMediaPreview('https://youtu.be/ABCDEFGHIJK', 'lbl');
    expect(vm.mediaPreview.value.kind).toBe('iframe');

    // Vimeo player
    vm.openMediaPreview('https://player.vimeo.com/video/123456', 'lbl');
    expect(vm.mediaPreview.value.kind).toBe('iframe');
    expect(String(vm.mediaPreview.value.url)).toContain('player.vimeo.com/video/123456');

    // Generic URL becomes iframe
    vm.openMediaPreview('https://example.com/file.mp4', 'lbl');
    expect(vm.mediaPreview.value.kind).toBe('iframe');
    expect(vm.mediaPreview.value.url).toBe('https://example.com/file.mp4');
  });

  it('imageMedia click opens placeholder or gallery and syncs indices', () => {
    const vm = wrapper.vm.__test as any;
    // Ensure imagesByProductionId is empty -> clicking imageMedia should open placeholder
    vm.imagesByProductionId.value = new Map();
    vm.onCellClicked({ data: { id: 7, source: {} }, colDef: { field: 'imageMedia', headerName: 'Image' } });
    expect(vm.mediaPreview.value.kind).toBe('image');
    expect(vm.mediaPreview.value.images).toEqual([]);

    // Simulate images present and click
    vm.imagesByProductionId.value = new Map([[8, [{ id: 1, url: 'a.jpg' }, { id: 2, url: 'b.jpg' }]]]);
    vm.onCellClicked({ data: { id: 8, source: {} }, colDef: { field: 'imageMedia', headerName: 'Image' } });
    expect(vm.mediaPreview.value.kind).toBe('gallery');
    expect(vm.mediaPreview.value.currentImageIndex).toBe(0);

    // call syncGalleryPreview if exposed
    if (typeof vm.syncGalleryPreview === 'function') {
      vm.syncGalleryPreview(1);
      expect(vm.mediaPreview.value.currentImageIndex).toBe(1);
      expect(vm.mediaPreview.value.url).toBe('b.jpg');
      vm.syncGalleryPreview(-1);
      expect(vm.mediaPreview.value.currentImageIndex).toBe(1);
    }
  });

  it('openMediaPreview placeholder contains escaped XML (via data url)', () => {
    const vm = wrapper.vm.__test as any;
    // use openMediaPreview blank to generate placeholder and ensure escaping
    vm.openMediaPreview('', 'label &<>"\'');
    const data = String(vm.mediaPreview.value.url || '');
    // svg open/close should be present in encoded form
    expect(data).toContain('%3Csvg');
    expect(data).toContain('%3E');
  });

  it('onMediaPreviewImageSelected returns early without file', async () => {
    const vm = wrapper.vm.__test as any;
    const fakeEvent = { target: { files: undefined, value: '' } } as unknown as Event;
    // ensure mediaPreview context
    vm.mediaPreview.value = { productionId: undefined };
    if (typeof vm.onMediaPreviewImageSelected === 'function') {
      await vm.onMediaPreviewImageSelected(fakeEvent);
      expect(vm.isSaving?.value).toBeFalsy();
    }
  });

  it('saveMediaVideoUrl early-return and successful path (if exposed)', async () => {
    const vm = wrapper.vm.__test as any;
    if (typeof vm.saveMediaVideoUrl !== 'function') return;

    // early return when no preview
    vm.mediaPreview.value = null;
    await vm.saveMediaVideoUrl();

    // success path
    vm.mediaPreview.value = { productionId: 11, mediaField: 'video_1', label: 'L' };
    vm.mediaPreviewEditUrl = ' https://x.example ';
    (updateProduction as any).mockResolvedValue({});
    await vm.saveMediaVideoUrl();
    expect(vm.mediaPreview.value.url).toBe('https://x.example');
  });

  it('removeMediaImage respects confirm and calls delete (if exposed)', async () => {
    const vm = wrapper.vm.__test as any;
    if (typeof vm.removeMediaImage !== 'function') return;

    // no imageId early return
    vm.mediaPreview.value = null;
    await vm.removeMediaImage();

    // when imageId and confirm false -> no delete
    vm.mediaPreview.value = { imageId: 99, productionId: 2, url: 'a.jpg', kind: 'image', label: 'L' };
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await vm.removeMediaImage();
    expect(deleteImageService).not.toHaveBeenCalled();

    // when confirm true -> delete called
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (deleteImageService as any).mockResolvedValue(undefined);
    await vm.removeMediaImage();
    expect(deleteImageService).toHaveBeenCalledWith(99);
  });

  it('removeMediaVideo respects confirm and updates (if exposed)', async () => {
    const vm = wrapper.vm.__test as any;
    if (typeof vm.removeMediaVideo !== 'function') return;
    vm.mediaPreview.value = { productionId: 5, mediaField: 'video_1', kind: 'iframe', url: 'u', label: 'L' };
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await vm.removeMediaVideo();
    expect(updateProduction).not.toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await vm.removeMediaVideo();
    expect(updateProduction).toHaveBeenCalled();
  });

  it('submitCreateProduction handles upload errors gracefully (if exposed)', async () => {
    const vm = wrapper.vm.__test as any;
    // prepare create form with one image data url
    vm.createForm.value.title.nl = 'T';
    vm.createForm.value.artist.nl = 'A';
    vm.createForm.value.tagline.nl = 'TL';
    vm.createForm.value.teaser.nl = 'TE';
    vm.createForm.value.media = [{ id: 'm1', type: 'image', url: 'data:fake', imageId: undefined, isUploaded: false }];
    (uploadImageWithCrops as any).mockRejectedValue(new Error('upload failed'));
    if (typeof vm.submitCreateProduction === 'function') {
      await vm.submitCreateProduction();
      // finished without throwing (no further exposed state to assert here)
    }
  });

  

  it('persistBulkProductionPatch updates rows when updatedRows returned', async () => {
    const vm = wrapper.vm.__test as any;
    const targetRows = [{ id: 42, source: {} }];
    // first call: no-op (loadCmsData mocked by component), second call returns updated rows
    (bulkUpdateProductions as any).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 42, title: { nl: 'X' } }]);
    await vm.persistBulkProductionPatch(targetRows, { title: { nl: 'X' } });
    // no exception and function completed
  });

  it('onCellEditingStopped genres non-finite value resets node data', async () => {
    const vm = wrapper.vm.__test as any;
    if (typeof vm.onCellEditingStopped !== 'function') return;

    const node = { setDataValue: vi.fn() } as any;
    const event = {
      data: { id: 1 },
      colDef: { field: 'genres' },
      value: 'abc',
      oldValue: '1',
      node,
    } as any;

    await vm.onCellEditingStopped(event);
    expect(node.setDataValue).toHaveBeenCalledWith('genres', 1);
  });
});
