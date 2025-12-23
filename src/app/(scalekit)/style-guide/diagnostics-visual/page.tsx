'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  getContext,
  listTypographyStyleOptions,
  listLogoTypeOptions,
  listFontOptions,
  listSocialTemplateTypes,
  listVisualStyleGuides,
  createVisualStyleGuide,
  updateVisualStyleGuide,
  deleteVisualStyleGuide,
  listPaletteColors,
  createPaletteColor,
  updatePaletteColor,
  deletePaletteColor,
  listTypographyStyles,
  createTypographyStyle,
  updateTypographyStyle,
  deleteTypographyStyle,
  listLogoAssets,
  createLogoAsset,
  updateLogoAsset,
  deleteLogoAsset,
  listSocialTemplates,
  createSocialTemplate,
  updateSocialTemplate,
  deleteSocialTemplate,
} from '../lib/api';

type TestResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

export default function VisualOSDiagnosticsPage() {
  const [env, setEnv] = useState<Record<string, unknown> | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const log = (r: TestResult) => setResults((prev) => [...prev, r]);

  const run = useMemo(() => async () => {
    setRunning(true);
    setResults([]);

    const ctx = await getContext();
    setEnv(ctx);
    log({ name: 'context.current_user_id()', ok: !!ctx.userId, detail: String(ctx.userId) });
    log({ name: 'context.customer_id()', ok: !!ctx.customerId, detail: String(ctx.customerId) });
    log({ name: 'context.role_id()', ok: !!ctx.roleId, detail: String(ctx.roleId) });

    // Option tables (system scope)
    {
      const [typo, logoTypes, fonts, stt] = await Promise.all([
        listTypographyStyleOptions(),
        listLogoTypeOptions(),
        listFontOptions({ limit: 5 }),
        listSocialTemplateTypes(),
      ]);
      log({ name: 'typography_style_options', ok: typo.ok, detail: typo.ok ? `${typo.data.length} options` : typo.error });
      log({ name: 'logo_type_options', ok: logoTypes.ok, detail: logoTypes.ok ? `${logoTypes.data.length} options` : logoTypes.error });
      log({ name: 'font_options', ok: fonts.ok, detail: fonts.ok ? `${fonts.data.length} fonts (sample)` : fonts.error });
      log({ name: 'social_template_types', ok: stt.ok, detail: stt.ok ? `${stt.data.length} types` : stt.error });
      if (!typo.ok || !logoTypes.ok || !fonts.ok || !stt.ok) return setRunning(false);
    }

    // CRUD flow
    let vsgId: string | null = null;
    let paletteColorId: string | null = null;
    let typoId: string | null = null;
    let logoId: string | null = null;
    let tmplId: string | null = null;
    try {
      // Create VSG
      const created = await createVisualStyleGuide({ name: `Diag VSG ${Date.now()}` });
      log({ name: 'visual_style_guides.create', ok: created.ok, detail: created.ok ? String(created.data.visual_style_guide_id) : String(created.error) });
      if (!created.ok) throw new Error(created.error);
      vsgId = String(created.data.visual_style_guide_id) as string | null;

      // List VSGs
      const listed = await listVisualStyleGuides({ limit: 10 });
      log({ name: 'visual_style_guides.list', ok: listed.ok, detail: listed.ok ? `${listed.data.length} rows` : listed.error });

      // Update VSG
      if (!vsgId) throw new Error('VSG ID is required');
      const updated = await updateVisualStyleGuide(vsgId, { description: 'Updated by diagnostics' });
      log({ name: 'visual_style_guides.update', ok: updated.ok, detail: updated.ok ? 'ok' : updated.error });

      // Palette color
      const pc = await createPaletteColor({ hex: '#3366FF', usage_option: 'primary', sort_order: 1 });
      log({ name: 'palette_colors.create', ok: pc.ok, detail: pc.ok ? String(pc.data.palette_color_id) : String(pc.error) });
      if (pc.ok) {
        paletteColorId = String(pc.data.palette_color_id) as string | null;
      }
      const pcl = await listPaletteColors();
      log({ name: 'palette_colors.list', ok: pcl.ok, detail: pcl.ok ? `${pcl.data.length} rows` : pcl.error });
      if (paletteColorId) {
        const pcu = await updatePaletteColor(paletteColorId, { name: 'Primary Blue' });
        log({ name: 'palette_colors.update', ok: pcu.ok, detail: pcu.ok ? 'ok' : pcu.error });
      }

      // Typography style
      const typo = await listTypographyStyleOptions();
      const fontOpts = await listFontOptions({ limit: 1 });
      const firstRole = typo.ok ? typo.data[0] : null;
      const firstFont = fontOpts.ok ? fontOpts.data[0] : null;
      if (firstRole) {
        const ts = await createTypographyStyle({
          visual_style_guide_id: vsgId!,
          typography_style_option_id: firstRole.typography_style_option_id,
          font_option_id: firstFont?.font_option_id ?? null,
          font_family: firstFont?.programmatic_name ?? 'system-ui',
          font_size_px: 16,
        });
        log({ name: 'typography_styles.create', ok: ts.ok, detail: ts.ok ? String(ts.data.typography_style_id) : String(ts.error) });
        if (ts.ok) typoId = String(ts.data.typography_style_id) as string | null;
        const tsl = await listTypographyStyles(vsgId!);
        log({ name: 'typography_styles.list', ok: tsl.ok, detail: tsl.ok ? `${tsl.data.length} rows` : tsl.error });
        if (typoId) {
          const tsu = await updateTypographyStyle(typoId, { font_weight: '600' });
          log({ name: 'typography_styles.update', ok: tsu.ok, detail: tsu.ok ? 'ok' : tsu.error });
        }
      }

      // Logo asset
      const lto = await listLogoTypeOptions();
      const firstLogoType = lto.ok ? lto.data[0] : null;
      if (firstLogoType) {
        const la = await createLogoAsset({
          visual_style_guide_id: vsgId!,
          logo_type_option_id: firstLogoType.logo_type_option_id,
          is_default: false,
          is_vector: false,
          is_circular_crop: false,
        });
        log({ name: 'logo_assets.create', ok: la.ok, detail: la.ok ? String(la.data.logo_asset_id) : String(la.error) });
        if (la.ok) logoId = String(la.data.logo_asset_id) as string | null;
        const lal = await listLogoAssets(vsgId!);
        log({ name: 'logo_assets.list', ok: lal.ok, detail: lal.ok ? `${lal.data.length} rows` : lal.error });
        if (logoId) {
          const lau = await updateLogoAsset(logoId, { is_default: true });
          log({ name: 'logo_assets.update', ok: lau.ok, detail: lau.ok ? 'ok' : lau.error });
        }
      }

      // Social template
      const stt = await listSocialTemplateTypes();
      const firstType = stt.ok ? stt.data[0] : null;
      if (firstType) {
        const stc = await createSocialTemplate({
          visual_style_guide_id: vsgId!,
          social_template_type_id: firstType.social_template_type_id,
          default_copy: 'Hello world',
          default_hashtags: ['#brand'],
          design_tokens: { variant: 'default' },
          is_locked: false,
        });
        log({ name: 'social_templates.create', ok: stc.ok, detail: stc.ok ? String(stc.data.social_template_id) : String(stc.error) });
        if (stc.ok) tmplId = String(stc.data.social_template_id) as string | null;
        const stl = await listSocialTemplates(vsgId!);
        log({ name: 'social_templates.list', ok: stl.ok, detail: stl.ok ? `${stl.data.length} rows` : stl.error });
        if (tmplId) {
          const stu = await updateSocialTemplate(tmplId, { is_locked: true });
          log({ name: 'social_templates.update', ok: stu.ok, detail: stu.ok ? 'ok' : stu.error });
        }
      }
    } catch (e: unknown) {
      log({ name: 'exception', ok: false, detail: (e instanceof Error ? e.message : String(e)) });
    } finally {
      // Cleanup best-effort
      if (tmplId) await deleteSocialTemplate(tmplId);
      if (logoId) await deleteLogoAsset(logoId);
      if (typoId) await deleteTypographyStyle(typoId);
      if (paletteColorId) await deletePaletteColor(paletteColorId);
      if (vsgId) await deleteVisualStyleGuide(vsgId);
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h2>Visual OS Diagnostics</h2>
      <div>
        <button onClick={() => run()} disabled={running}>{running ? 'Running…' : 'Run Tests'}</button>
      </div>
      <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8 }}>
        <h3>Environment</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(env, null, 2)}</pre>
      </div>
      <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8 }}>
        <h3>Results</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {results.map((r, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px dashed #eee' }}>
              <span style={{ width: 14, height: 14, borderRadius: 7, background: r.ok ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
              <strong style={{ minWidth: 260 }}>{r.name}</strong>
              <span>{r.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


