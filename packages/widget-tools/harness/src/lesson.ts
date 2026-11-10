import type { TeachariumLessonExport } from "@teacharium/player";

const LESSON_ID = "00000000-0000-4000-8000-000000000001";
const SECTION_ID = "00000000-0000-4000-8000-000000000002";
const STEP_ID = "00000000-0000-4000-8000-000000000003";
const CELL_ID = "preview";

export interface PreviewLayout {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export const DEFAULT_LAYOUT: PreviewLayout = {
  col: 2,
  row: 2,
  colSpan: 10,
  rowSpan: 10,
};

/**
 * A one-step lesson containing the component under preview, in the same
 * export format SCORM packages and the self-hosted player use.
 */
export function buildPreviewLesson(
  componentName: string,
  props: Record<string, unknown>,
  layout: PreviewLayout,
): TeachariumLessonExport {
  return {
    lesson: {
      id: LESSON_ID,
      title: `${componentName} preview`,
      variable_definitions: [],
      widget_settings: { overrides: {} },
      color_palette_id: "default",
      show_table_of_contents: false,
      show_navbar: true,
      custom_css: "",
    },
    sections: [
      {
        id: SECTION_ID,
        name: "Preview",
        order_index: 0,
        steps: [
          {
            id: STEP_ID,
            name: componentName,
            order_index: 0,
            puck_data: {
              root: {
                props: {
                  gap: 16,
                  cells: [{ id: CELL_ID, ...layout }],
                  items: [
                    {
                      id: CELL_ID,
                      content: [
                        {
                          type: componentName,
                          props: { id: `${componentName}-preview`, ...props },
                        },
                      ],
                    },
                  ],
                },
              },
              content: [],
            },
          },
        ],
      },
    ],
  } as unknown as TeachariumLessonExport;
}
