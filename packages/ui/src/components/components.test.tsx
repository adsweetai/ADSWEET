import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ActionCard } from "./ActionCard";
import { AdLabel, StatusBadge } from "./Badges";
import { ChoiceCards } from "./Choices";
import { EuroTile, FunnelBar } from "./Figures";
import { Switch } from "./Switch";
import { ToastProvider, useToast } from "./Toast";
import { WarningBlock } from "./Advice";

describe("statusbadge en label", () => {
  it("toont altijd een icoon en een woord", () => {
    render(<StatusBadge kind="act">Actie nodig</StatusBadge>);
    const badge = screen.getByText("Actie nodig");
    expect(badge.querySelector("svg")).not.toBeNull();
    expect(badge.className).toContain("as-badge--act");
  });
  it("verliezer gebruikt actie nodig, winnaar in orde", () => {
    render(
      <>
        <AdLabel kind="verliezer">Verliezer</AdLabel>
        <AdLabel kind="winnaar">Winnaar</AdLabel>
      </>,
    );
    expect(screen.getByText("Verliezer").className).toContain("as-badge--act");
    expect(screen.getByText("Winnaar").className).toContain("as-badge--ok");
  });
});

describe("actiekaart", () => {
  it("robijn punt alleen als gevraagd, en Waarom? klapt de rekensom open", () => {
    const off = vi.fn();
    const { container } = render(
      <ActionCard
        proposalLabel="Voorstel van AdSweet"
        robijn
        title="Lisa, ‘Sfeerbeeld woonkamer’ gaf €72 uit zonder verkoop."
        why={{ label: "Waarom?", content: <span>3 × €23,20 = €69,60.</span> }}
        primary={{ label: "Zet hem af", onClick: off }}
        later={{ label: "Later" }}
      />,
    );
    expect(container.querySelector(".as-proposal--robijn")).not.toBeNull();
    expect(screen.queryByText("3 × €23,20 = €69,60.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Waarom?" }));
    expect(screen.getByText("3 × €23,20 = €69,60.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Zet hem af/ }));
    expect(off).toHaveBeenCalledOnce();
  });
});

describe("EuroTegel en funnelbalk", () => {
  it("het laatste blok valt op", () => {
    const { container } = render(
      <EuroTile
        blocks={[
          { label: "Uitgegeven", value: "€280" },
          { label: "ROAS", value: "2,28" },
        ]}
      />,
    );
    const blocks = container.querySelectorAll(".as-eurotile__block");
    expect(blocks[1].className).toContain("as-eurotile__block--last");
    expect(container.querySelectorAll(".as-eurotile__arrow")).toHaveLength(1);
  });
  it("een ontbrekende fase toont Ontbreekt", () => {
    render(<FunnelBar counts={{ top: 3, middle: 2, bottom: 0 }} format={(n) => `${n} ads`} missing="Ontbreekt" />);
    expect(screen.getByText("Ontbreekt").parentElement?.className).toContain("as-funnel__cell--missing");
  });
});

describe("keuzes en schakelaars", () => {
  function Demo() {
    const [v, setV] = useState<"a" | "b">("a");
    return (
      <ChoiceCards
        label="Wat wil je bereiken?"
        value={v}
        onChange={setV}
        options={[
          { value: "a", title: "Online verkopen" },
          { value: "b", title: "Aanvragen of afspraken" },
        ]}
      />
    );
  }
  it("pijltjestoetsen wisselen de keuze", () => {
    render(<Demo />);
    const [a, b] = screen.getAllByRole("radio");
    expect(a.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(b.getAttribute("aria-checked")).toBe("true");
  });
  it("de schakelaar meldt de nieuwe stand", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Muziek" />);
    fireEvent.click(screen.getByRole("switch", { name: "Muziek" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("waarschuwing en melding", () => {
  it("waarschuwing met Toch doorgaan", () => {
    const go = vi.fn();
    render(
      <WarningBlock title="Pas op, dit raden we niet aan." proceed={{ label: "Toch doorgaan", onClick: go }}>
        Met budget op campagneniveau stuurt Meta het geld zelf.
      </WarningBlock>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Pas op, dit raden we niet aan.");
    fireEvent.click(screen.getByRole("button", { name: "Toch doorgaan" }));
    expect(go).toHaveBeenCalled();
  });
  it("Ongedaan maken voert de undo uit en sluit de melding", () => {
    const undo = vi.fn();
    function Btn() {
      const t = useToast();
      return <button onClick={() => t.show({ message: "Staat af.", undo })}>toon</button>;
    }
    render(
      <ToastProvider undoLabel="Ongedaan maken" closeLabel="Sluiten">
        <Btn />
      </ToastProvider>,
    );
    act(() => fireEvent.click(screen.getByText("toon")));
    fireEvent.click(screen.getByRole("button", { name: /Ongedaan maken/ }));
    expect(undo).toHaveBeenCalled();
    expect(screen.queryByText("Staat af.")).toBeNull();
  });
});
