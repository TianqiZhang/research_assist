import type { Hono } from "hono";

import { DEV_USER_ID, createAssistantWithProfile, ensureDevUser, updateAssistantWithProfile } from "../domain/assistants";
import type { Assistant, AssistantProfile, AssistantRun, Digest, JsonObject } from "../domain/types";
import { runResearchAssistantWorkflow } from "../workflow";
import { sanitizeDigestHtml } from "../frontend/sanitize";
import { resolveEmailProvider, resolveLlmProvider, resolveRepositories } from "./dependencies";
import type { AppBindings, AppOptions } from "./types";

const appStyles = `
  body { margin: 0; font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, sans-serif; color: #1f2933; background: #f7f8fa; }
  a { color: #155e75; text-decoration: none; }
  a:hover { text-decoration: underline; }
  header { background: #ffffff; border-bottom: 1px solid #d8dee4; }
  nav { max-width: 1120px; margin: 0 auto; height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
  main { max-width: 1120px; margin: 0 auto; padding: 24px 20px 48px; }
  h1 { font-size: 24px; margin: 0; }
  h2 { font-size: 16px; margin: 0 0 12px; }
  p { margin: 4px 0 0; color: #536471; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d8dee4; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { font-size: 12px; color: #536471; background: #f3f4f6; }
  input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #cbd5df; border-radius: 6px; padding: 8px 10px; font: inherit; background: #fff; }
  textarea { min-height: 120px; }
  label { display: grid; gap: 6px; font-weight: 600; margin-bottom: 12px; }
  button, .button { border: 1px solid #b6c2cf; background: #fff; border-radius: 6px; padding: 7px 10px; font: inherit; cursor: pointer; display: inline-block; }
  .primary { background: #155e75; border-color: #155e75; color: #fff; }
  .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
  .panel, .empty { background: #fff; border: 1px solid #d8dee4; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .grid.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  dl { display: grid; grid-template-columns: 140px 1fr; gap: 8px 14px; margin: 0; }
  dt { color: #536471; }
  dd { margin: 0; }
  .error { border: 1px solid #f0b4b4; background: #fff5f5; color: #9b1c1c; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
  .timeline { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
  .timeline li { display: grid; grid-template-columns: 52px 190px 1fr; gap: 10px; align-items: start; }
  .level { text-transform: uppercase; font-size: 11px; color: #536471; }
  .level.error { color: #b42318; }
  .level.warn { color: #a15c07; }
  .digest { background: #fff; border: 1px solid #d8dee4; border-radius: 8px; padding: 18px; margin-bottom: 16px; }
  pre { white-space: pre-wrap; margin: 0; }
  @media (max-width: 760px) { .grid.two { grid-template-columns: 1fr; } .page-head { display: block; } .timeline li { grid-template-columns: 1fr; } }
`;

export function registerFrontendRoutes(app: Hono<AppBindings>, options: AppOptions): void {
  app.get("/", (c) => c.redirect("/app"));

  app.get("/app", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);
    const assistants = await repositories.assistants.listByUser(DEV_USER_ID);
    const rows = await Promise.all(
      assistants.map(async (assistant) => ({
        assistant,
        latestRun: (await repositories.runs.listByAssistant(assistant.id))[0],
        latestDigest: (await repositories.digests.listByAssistant(assistant.id))[0]
      }))
    );

    return c.html(
      <Layout title="Research Assistant">
        <div class="page-head">
          <div>
            <h1>Research assistants</h1>
            <p>Configured arXiv monitors and their latest run state.</p>
          </div>
          <a class="button primary" href="/app/assistants/new">New assistant</a>
        </div>
        {rows.length === 0 ? (
          <section class="empty">
            <h2>No assistants yet</h2>
            <p>Create an assistant to start tracking recent arXiv papers.</p>
            <a class="button primary" href="/app/assistants/new">Create assistant</a>
          </section>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Schedule</th>
                <th>Latest run</th>
                <th>Latest digest</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ assistant, latestRun, latestDigest }) => (
                <tr>
                  <td><a href={`/app/assistants/${assistant.id}`}>{assistant.name}</a></td>
                  <td>{assistant.isActive ? "Active" : "Inactive"}</td>
                  <td>{assistant.scheduleCron ?? "Manual"}</td>
                  <td>{latestRun?.status ?? "None"}</td>
                  <td>{latestDigest ? latestDigest.createdAt.slice(0, 10) : "None"}</td>
                  <td>
                    <form method="post" action={`/app/assistants/${assistant.id}/runs`}>
                      <button type="submit">Run</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Layout>
    );
  });

  app.get("/app/assistants/new", (c) =>
    c.html(
      <Layout title="New Assistant">
        <AssistantForm action="/app/assistants" />
      </Layout>
    )
  );

  app.post("/app/assistants", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);
    const parsed = parseAssistantForm(await c.req.parseBody());

    if ("error" in parsed) {
      return c.html(
        <Layout title="New Assistant">
          <AssistantForm action="/app/assistants" error={parsed.error} values={parsed.values} />
        </Layout>,
        400
      );
    }

    const { assistant } = await createAssistantWithProfile(
      {
        ...parsed.value,
        userId: DEV_USER_ID
      },
      {
        repositories,
        llmProvider: resolveLlmProvider(c.env, options)
      }
    );

    return c.redirect(`/app/assistants/${assistant.id}`, 303);
  });

  app.get("/app/assistants/:id", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    const assistant = await repositories.assistants.getById(c.req.param("id"));

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return c.notFound();
    }

    const profile = await repositories.profiles.getLatest(assistant.id);
    const runs = await repositories.runs.listByAssistant(assistant.id);
    const digests = await repositories.digests.listByAssistant(assistant.id);

    return c.html(
      <Layout title={assistant.name}>
        <div class="page-head">
          <div>
            <h1>{assistant.name}</h1>
            <p>{assistant.description}</p>
          </div>
          <form method="post" action={`/app/assistants/${assistant.id}/runs`}>
            <button class="primary" type="submit">Run now</button>
          </form>
          <a class="button" href={`/app/assistants/${assistant.id}/edit`}>Edit</a>
        </div>
        <section class="grid two">
          <Panel title="Configuration">
            <dl>
              <dt>Categories</dt><dd>{assistant.arxivCategories.join(", ")}</dd>
              <dt>Schedule</dt><dd>{assistant.scheduleCron ?? "Manual"}</dd>
              <dt>Timezone</dt><dd>{assistant.timezone}</dd>
              <dt>Paper count</dt><dd>{assistant.paperCount}</dd>
              <dt>Active</dt><dd>{assistant.isActive ? "Yes" : "No"}</dd>
            </dl>
          </Panel>
          <Panel title="Latest profile">
            {profile ? <ProfileSummary profile={profile} /> : <p>No profile compiled yet.</p>}
          </Panel>
        </section>
        <Panel title="Recent runs">
          <RunTable runs={runs.slice(0, 8)} />
        </Panel>
        <Panel title="Digest history">
          <DigestList digests={digests.slice(0, 8)} />
        </Panel>
      </Layout>
    );
  });

  app.get("/app/assistants/:id/edit", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    const assistant = await repositories.assistants.getById(c.req.param("id"));

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return c.notFound();
    }

    return c.html(
      <Layout title={`Edit ${assistant.name}`}>
        <AssistantForm
          action={`/app/assistants/${assistant.id}/edit`}
          heading="Edit assistant"
          submitLabel="Save"
          values={assistantFormValues(assistant)}
        />
      </Layout>
    );
  });

  app.post("/app/assistants/:id/edit", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    const assistant = await repositories.assistants.getById(c.req.param("id"));

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return c.notFound();
    }

    const parsed = parseAssistantForm(await c.req.parseBody());

    if ("error" in parsed) {
      return c.html(
        <Layout title={`Edit ${assistant.name}`}>
          <AssistantForm
            action={`/app/assistants/${assistant.id}/edit`}
            heading="Edit assistant"
            submitLabel="Save"
            error={parsed.error}
            values={parsed.values}
          />
        </Layout>,
        400
      );
    }

    await updateAssistantWithProfile(
      assistant.id,
      parsed.value,
      {
        repositories,
        llmProvider: resolveLlmProvider(c.env, options)
      }
    );

    return c.redirect(`/app/assistants/${assistant.id}`, 303);
  });

  app.post("/app/assistants/:id/runs", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    const assistant = await repositories.assistants.getById(c.req.param("id"));

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return c.notFound();
    }

    const run = await repositories.runs.create({
      assistantId: assistant.id,
      triggerType: "manual",
      requestedByUserId: DEV_USER_ID
    });
    await runResearchAssistantWorkflow(
      {
        runId: run.id,
        assistantId: assistant.id,
        triggerType: "manual",
        requestedByUserId: DEV_USER_ID
      },
      {
        repositories,
        llmProvider: resolveLlmProvider(c.env, options),
        emailProvider: resolveEmailProvider(c.env, options),
        now: options.now
      }
    );

    return c.redirect(`/app/runs/${run.id}`, 303);
  });

  app.get("/app/runs/:id", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    const run = await repositories.runs.getById(c.req.param("id"));

    if (!run) {
      return c.notFound();
    }

    const assistant = await repositories.assistants.getById(run.assistantId);

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return c.notFound();
    }

    const events = await repositories.runEvents.listByRun(run.id);
    const digest = await repositories.digests.getByRunId(run.id);

    return c.html(
      <Layout title={`Run ${run.status}`}>
        <div class="page-head">
          <div>
            <h1>Run status</h1>
            <p>{assistant.name}</p>
          </div>
          {digest ? <a class="button" href={`/app/digests/${digest.id}`}>Open digest</a> : null}
        </div>
        <Panel title="Summary">
          <dl>
            <dt>Status</dt><dd>{run.status}</dd>
            <dt>Started</dt><dd>{run.startedAt ?? "Not started"}</dd>
            <dt>Finished</dt><dd>{run.finishedAt ?? "Not finished"}</dd>
            <dt>Error</dt><dd>{run.errorMessage ?? "None"}</dd>
          </dl>
        </Panel>
        <Panel title="Timeline">
          <ol class="timeline">
            {events.map((event) => (
              <li>
                <span class={`level ${event.level}`}>{event.level}</span>
                <strong>{event.step}</strong>
                <span>{event.message}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </Layout>
    );
  });

  app.get("/app/digests/:id", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    const digest = await repositories.digests.getById(c.req.param("id"));

    if (!digest) {
      return c.notFound();
    }

    const assistant = await repositories.assistants.getById(digest.assistantId);

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return c.notFound();
    }

    return c.html(
      <Layout title={`${assistant.name} Digest`}>
        <div class="page-head">
          <div>
            <h1>{assistant.name}</h1>
            <p>Email status: {digest.emailStatus}</p>
          </div>
          <a class="button" href={`/app/assistants/${assistant.id}`}>Assistant</a>
        </div>
        <section class="digest" dangerouslySetInnerHTML={{ __html: sanitizeDigestHtml(digest.html) }} />
        <Panel title="Selected papers">
          <ul>
            {selectedPaperRows(digest).map((paper) => (
              <li><a href={paper.href}>{paper.label}</a></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Quality check">
          <pre>{JSON.stringify(digest.qualityCheck ?? {}, null, 2)}</pre>
        </Panel>
      </Layout>
    );
  });
}

function Layout(props: { title: string; children: unknown }) {
  return (
    <html>
      <head>
        <title>{props.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{appStyles}</style>
      </head>
      <body>
        <header><nav><a href="/app">Research Assistant</a><a href="/app/assistants/new">New</a></nav></header>
        <main>{props.children}</main>
      </body>
    </html>
  );
}

function Panel(props: { title: string; children: unknown }) {
  return <section class="panel"><h2>{props.title}</h2>{props.children}</section>;
}

function AssistantForm(props: {
  action: string;
  error?: string;
  heading?: string;
  submitLabel?: string;
  values?: Record<string, string>;
}) {
  const values = props.values ?? {};
  return (
    <section class="panel">
      <h1>{props.heading ?? "New assistant"}</h1>
      {props.error ? <div class="error">{props.error}</div> : null}
      <form method="post" action={props.action}>
        <label>Name<input name="name" value={values.name ?? ""} /></label>
        <label>Description<textarea name="description">{values.description ?? ""}</textarea></label>
        <label>arXiv categories<input name="arxiv_categories" value={values.arxiv_categories ?? "cs.AI, cs.CL, cs.LG"} /></label>
        <label>Schedule cron<input name="schedule_cron" value={values.schedule_cron ?? ""} /></label>
        <label>Timezone<input name="timezone" value={values.timezone ?? "UTC"} /></label>
        <label>Paper count<input name="paper_count" type="number" min="1" max="20" value={values.paper_count ?? "5"} /></label>
        <input name="is_active" type="hidden" value="false" />
        <label><span>Active</span><input name="is_active" type="checkbox" value="true" checked={(values.is_active ?? "true") === "true"} /></label>
        <button class="primary" type="submit">{props.submitLabel ?? "Create"}</button>
      </form>
    </section>
  );
}

function ProfileSummary(props: { profile: AssistantProfile }) {
  const profile = props.profile.profile;
  return <pre>{JSON.stringify(profile, null, 2)}</pre>;
}

function RunTable(props: { runs: AssistantRun[] }) {
  if (props.runs.length === 0) return <p>No runs yet.</p>;
  return <table><tbody>{props.runs.map((run) => <tr><td><a href={`/app/runs/${run.id}`}>{run.status}</a></td><td>{run.createdAt}</td></tr>)}</tbody></table>;
}

function DigestList(props: { digests: Digest[] }) {
  if (props.digests.length === 0) return <p>No digests yet.</p>;
  return <table><tbody>{props.digests.map((digest) => <tr><td><a href={`/app/digests/${digest.id}`}>{digest.createdAt}</a></td><td>{digest.emailStatus}</td></tr>)}</tbody></table>;
}

function parseAssistantForm(body: Record<string, unknown>):
  | { value: { name: string; description: string; arxivCategories: string[]; scheduleCron?: string; timezone: string; paperCount: number; isActive: boolean }; values: Record<string, string> }
  | { error: string; values: Record<string, string> } {
  const values = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(Array.isArray(value) ? value.at(-1) ?? "" : value)]));
  const name = values.name?.trim() ?? "";
  const description = values.description?.trim() ?? "";
  const paperCount = Number(values.paper_count ?? 5);

  if (!name) return { error: "Name is required.", values };
  if (!description) return { error: "Description is required.", values };
  if (!Number.isInteger(paperCount) || paperCount < 1 || paperCount > 20) {
    return { error: "Paper count must be between 1 and 20.", values };
  }

  return {
    value: {
      name,
      description,
      arxivCategories: (values.arxiv_categories ?? "cs.AI, cs.CL, cs.LG").split(",").map((part) => part.trim()).filter(Boolean),
      scheduleCron: values.schedule_cron?.trim() || undefined,
      timezone: values.timezone?.trim() || "UTC",
      paperCount,
      isActive: values.is_active === "true" || values.is_active === "on"
    },
    values
  };
}

function assistantFormValues(assistant: Assistant): Record<string, string> {
  return {
    name: assistant.name,
    description: assistant.description,
    arxiv_categories: assistant.arxivCategories.join(", "),
    schedule_cron: assistant.scheduleCron ?? "",
    timezone: assistant.timezone,
    paper_count: String(assistant.paperCount),
    is_active: assistant.isActive ? "true" : "false"
  };
}

function selectedPaperRows(digest: Digest): Array<{ href: string; label: string }> {
  return digest.selectedPapers
    .filter((paper): paper is JsonObject => typeof paper === "object" && paper !== null && !Array.isArray(paper))
    .map((paper) => {
      const arxivId = typeof paper.arxiv_id === "string" ? paper.arxiv_id : "unknown";
      return {
        href: `https://arxiv.org/abs/${arxivId}`,
        label: arxivId
      };
    });
}
