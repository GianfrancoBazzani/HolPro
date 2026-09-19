import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, SelectField, TextareaField } from "../components/forms/field";
import { FormDialog } from "../components/forms/form-dialog";
it("associates labels and errors with each field", () => {
  for (const field of [
    <Field key="i" name="title" label="Title" errors={["Required"]} />,
    <SelectField
      key="s"
      name="kind"
      label="Kind"
      options={[{ value: "call", label: "Call" }]}
      errors={["Required"]}
    />,
    <TextareaField key="t" name="note" label="Note" errors={["Required"]} />,
  ]) {
    const html = renderToStaticMarkup(field);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("aria-describedby=");
    expect(html).toContain("for=");
    expect(html).toContain("Required");
  }
});
it("does not expose closed dialog content", () => {
  expect(
    renderToStaticMarkup(
      <FormDialog open={false} title="Edit" onClose={() => {}}>
        Content
      </FormDialog>,
    ),
  ).toBe("");
});
