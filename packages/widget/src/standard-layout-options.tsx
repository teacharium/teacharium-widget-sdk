/* eslint-disable react-refresh/only-export-components */
import type { PuckComponent } from "@measured/puck";
import type { TeachariumComponentConfig } from "./teacharium-widget";
import type React from "react";

// interface StandardLayoutProps {
//   margin: Field;
//   width: Field;
// }

const standardLayoutOptions = {
  margin: {
    type: "number",
    label: "Margin",
    min: 0,
    max: 100,
    step: 1,
  },
  //   width: {
  //     label: "Width",
  //     type: "radio",
  //     options: [
  //       { label: "Full", value: "full" },
  //       { label: "Partial", value: "partial" },
  //     ],
  //   },
} as const;

type StandardLayoutProps = {
  margin: number;
};

export const LayoutContainer: PuckComponent<
  StandardLayoutProps & { children: React.ReactNode }
> = ({ margin, children }) => {
  const layoutStyle: React.CSSProperties = {};
  if (margin) {
    layoutStyle.padding = `${margin}px`;
  }
  //   if (width) {
  //     layoutStyle.width = width === "partial" ? "80%" : "100%";
  //     layoutStyle.margin = width === "partial" ? "0 auto" : "0";
  //   }
  return <div style={layoutStyle}>{children}</div>;
};

export const addStandardLayoutOptions = <T,>(
  config: TeachariumComponentConfig<T>,
): TeachariumComponentConfig<T & StandardLayoutProps> => {
  const Render = config.render;

  return {
    ...config,
    render: (props) => {
      return (
        <LayoutContainer {...props}>
          <Render {...props} />
        </LayoutContainer>
      );
    },
    fields: {
      ...config.fields,
      ...standardLayoutOptions,
    },
  };
};
