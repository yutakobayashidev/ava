/**
 * 👏: https://zenn.dev/kimuson/articles/type_safe_prompt
 */

/**
 * 文字列型テンプレートから変数部分を抽出する型
 * 例: `"Hello, {{name}}!"` から `"name"` を抽出
 *
 * @template T - 入力文字列型
 * @template Vars - 現在までに抽出した変数を保持する型
 * @example
 * type Variables = ExtractPromptVariables<"Hello, {{name}}!">; // "name"
 */
type ExtractPromptVariables<
  T extends string,
  Vars = never,
> = T extends `${infer Before}{{${infer I}}}${infer After}`
  ? ExtractPromptVariables<`${Before}${After}`, Vars | I>
  : Vars;

/**
 * プレースホルダを指定された変数で埋めるための型
 * 例: `"Hello, {{name}}!"` と `{ name: "Alice" }` から `"Hello, Alice!"` を生成
 *
 * @template T - 入力文字列型（テンプレート文字列）
 * @template Vars - 変数のキーと値のペア
 * @example
 * type Filled = FilledPrompt<"Hello, {{name}}!", { name: "Alice" }>; // "Hello, Alice!"
 */
type FilledPrompt<
  T extends string,
  Vars extends { [K: string]: string },
> = T extends `${infer Before}{{${infer I}}}${infer After}`
  ? FilledPrompt<`${Before}${Vars[I]}${After}`, Vars>
  : T;

/**
 * テンプレート文字列を与えられた変数で埋め込む関数
 * プレースホルダを対応する変数の値で置き換える
 * プロンプトの生成などに利用
 *
 * @param template - プレースホルダ（例: `{{name}}`）を含む文字列テンプレート
 * @param vars - 変数名とその値のペア
 * @returns プレースホルダが埋め込まれたテンプレート文字列
 *
 * @example
 * const result = fillPrompt("Hello, {{name}}!", { name: "Alice" });
 * console.log(result); // "Hello, Alice!"
 */
export const fillPrompt = <
  const Template extends string,
  const Vars extends {
    [K in VariableNames]: string;
  },
  VariableNames extends string = ExtractPromptVariables<Template>,
>(
  template: Template,
  vars: Vars,
) => {
  return Object.entries(vars).reduce(
    (template: string, [key, value]) =>
      template.replaceAll(`{{${key}}}`, String(value)),
    template,
  ) as FilledPrompt<Template, Vars>;
};
