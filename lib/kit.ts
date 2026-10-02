const KIT_API = "https://api.kit.com/v4";

const ROLE_TAG_ENV: Record<string, string> = {
  classes: "KIT_TAG_ID_ROLE_CLASSES",
  "own-school": "KIT_TAG_ID_ROLE_OWN_SCHOOL",
  admin: "KIT_TAG_ID_ROLE_ADMIN",
  online: "KIT_TAG_ID_ROLE_ONLINE",
};

const GRAD_TAG_ENV: Record<string, string> = {
  monitor: "KIT_TAG_ID_GRAD_MONITOR",
  professor: "KIT_TAG_ID_GRAD_PROFESSOR",
  "contra-mestre": "KIT_TAG_ID_GRAD_CONTRA_MESTRE",
  mestre: "KIT_TAG_ID_GRAD_MESTRE",
  "grao-mestre": "KIT_TAG_ID_GRAD_GRAO_MESTRE",
  ungraded: "KIT_TAG_ID_GRAD_UNGRADED",
};

const LANG_TAG_ENV: Record<string, string> = {
  en: "KIT_TAG_ID_LANG_EN",
  pt: "KIT_TAG_ID_LANG_PT",
  es: "KIT_TAG_ID_LANG_ES",
  fr: "KIT_TAG_ID_LANG_FR",
};

export async function subscribeToKit({
  name,
  email,
  segment,
  teachingRole,
  graduationLevel,
  lang,
}: {
  name: string;
  email: string;
  segment: string;
  teachingRole: string | null;
  graduationLevel: string | null;
  lang: string | null;
}): Promise<void> {
  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.warn("[kit] KIT_API_KEY not set — skipping");
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Kit-Api-Key": apiKey,
  };

  const subRes = await fetch(`${KIT_API}/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email_address: email,
      first_name: name,
      fields: { capoeira_segment: segment },
    }),
  });

  if (!subRes.ok) {
    throw new Error(`subscribe failed ${subRes.status}: ${await subRes.text()}`);
  }

  const tagEnvKeys = [
    teachingRole ? ROLE_TAG_ENV[teachingRole] : undefined,
    graduationLevel ? GRAD_TAG_ENV[graduationLevel] : undefined,
    lang ? LANG_TAG_ENV[lang] : undefined,
  ];

  const tagIds = tagEnvKeys
    .map((key) => (key ? process.env[key] : undefined))
    .filter(Boolean) as string[];

  await Promise.all(
    tagIds.map((id) =>
      fetch(`${KIT_API}/tags/${id}/subscribers`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email_address: email }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(`tag ${id} failed ${r.status}: ${await r.text()}`);
      })
    )
  );
}
