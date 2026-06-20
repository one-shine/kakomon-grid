import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Home } from "./Home";
import { useStore } from "@/store/useStore";

beforeEach(() => {
  useStore.setState({ schools: [], attempts: [] });
});

describe("<Home>", () => {
  it("空のときは初回体験(3ステップ＋サンプルCTA)を出す", () => {
    render(<Home />);
    expect(screen.getByText("サンプルで試す")).toBeInTheDocument();
    expect(screen.getByText(/志望校を登録/)).toBeInTheDocument();
  });

  it("「サンプルで試す」でサンプル校が投入され一覧に出る", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("サンプルで試す"));
    expect(useStore.getState().schools.length).toBeGreaterThan(0);
    expect(screen.getByText(/見本中学校/)).toBeInTheDocument();
  });

  it("学校があるときは追加ボタンを出す", () => {
    useStore.setState({
      schools: [{ id: "s1", name: "桜花中", subjects: [{ name: "国語", max: 150 }] }],
      attempts: [],
    });
    render(<Home />);
    expect(screen.getByText("＋ 志望校を追加")).toBeInTheDocument();
    expect(screen.getByText("桜花中")).toBeInTheDocument();
  });
});
