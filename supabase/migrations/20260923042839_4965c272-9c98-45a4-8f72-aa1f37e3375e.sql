CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  template text NOT NULL CHECK (template IN ('rh','manager','direction')),
  title text NOT NULL,
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  previous_start date,
  previous_end date,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','valide','exporte')),
  version integer NOT NULL DEFAULT 1,
  is_demo boolean NOT NULL DEFAULT false,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

GRANT SELECT, INSERT, UPDATE ON public.weekly_reports TO authenticated;
GRANT ALL ON public.weekly_reports TO service_role;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des rapports de son organisation"
ON public.weekly_reports FOR SELECT TO authenticated
USING (org_id = public.current_org_id());

CREATE POLICY "Creation par RH et managers"
ON public.weekly_reports FOR INSERT TO authenticated
WITH CHECK (
  org_id = public.current_org_id()
  AND author_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin_rh')
    OR public.has_role(auth.uid(), 'rh')
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Mise a jour par RH et managers"
ON public.weekly_reports FOR UPDATE TO authenticated
USING (
  org_id = public.current_org_id()
  AND (
    public.has_role(auth.uid(), 'admin_rh')
    OR public.has_role(auth.uid(), 'rh')
    OR public.has_role(auth.uid(), 'manager')
  )
)
WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER weekly_reports_touch BEFORE UPDATE ON public.weekly_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX weekly_reports_org_period_idx ON public.weekly_reports (org_id, period_start DESC);

CREATE TABLE public.weekly_report_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.weekly_reports(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  key text NOT NULL,
  label text NOT NULL,
  definition text NOT NULL,
  unit text NOT NULL DEFAULT 'nombre',
  value numeric,
  numerator numeric,
  denominator numeric,
  formula text NOT NULL,
  source text NOT NULL,
  reliability text NOT NULL DEFAULT 'calculee',
  previous_value numeric,
  comparison_note text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, key)
);

GRANT SELECT, INSERT ON public.weekly_report_metrics TO authenticated;
GRANT ALL ON public.weekly_report_metrics TO service_role;
ALTER TABLE public.weekly_report_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des indicateurs de son organisation"
ON public.weekly_report_metrics FOR SELECT TO authenticated
USING (org_id = public.current_org_id());

CREATE POLICY "Creation des indicateurs par RH et managers"
ON public.weekly_report_metrics FOR INSERT TO authenticated
WITH CHECK (
  org_id = public.current_org_id()
  AND (
    public.has_role(auth.uid(), 'admin_rh')
    OR public.has_role(auth.uid(), 'rh')
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE INDEX weekly_report_metrics_report_idx ON public.weekly_report_metrics (report_id);

CREATE TABLE public.weekly_report_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.weekly_reports(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  target text NOT NULL DEFAULT 'google_slides',
  status text NOT NULL DEFAULT 'autorisation_requise'
    CHECK (status IN ('autorisation_requise','en_cours','reussi','echec')),
  external_id text,
  external_url text,
  error_detail text,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  confirmed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weekly_report_exports TO authenticated;
GRANT ALL ON public.weekly_report_exports TO service_role;
ALTER TABLE public.weekly_report_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des exports de son organisation"
ON public.weekly_report_exports FOR SELECT TO authenticated
USING (org_id = public.current_org_id());

CREATE TRIGGER weekly_report_exports_touch BEFORE UPDATE ON public.weekly_report_exports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX weekly_report_exports_report_idx ON public.weekly_report_exports (report_id);