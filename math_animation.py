from manim import *
import numpy as np


class InscribedTriangleSolution(Scene):
    def construct(self):
        # -------- Left panel: problem text --------
        problem_title = Text("Bai toan:", font_size=34, color=WHITE)
        problem_text = Text(
            "Tam giac deu MNP co canh 9 cm.\n"
            "Tinh ban kinh R cua duong tron ngoai tiep.",
            font_size=28,
            line_spacing=0.9,
            color=WHITE,
        )
        problem_block = VGroup(problem_title, problem_text).arrange(
            DOWN, aligned_edge=LEFT, buff=0.22
        )
        problem_block.to_edge(LEFT, buff=0.6).to_edge(UP, buff=0.6)

        # -------- Right panel: geometry area --------
        geometry_center = np.array([3.4, 0.2, 0.0])
        circle_radius = 2.15

        circle = Circle(radius=circle_radius, color=BLUE, stroke_width=5)
        circle.move_to(geometry_center)

        o_dot = Dot(geometry_center, color=WHITE, radius=0.055)
        o_label = MathTex("O", font_size=34).next_to(o_dot, DOWN + LEFT, buff=0.12)

        # Equilateral triangle vertices on circumcircle (120 deg apart)
        angle_m = 90 * DEGREES
        angle_n = 210 * DEGREES
        angle_p = 330 * DEGREES

        m = geometry_center + circle_radius * np.array([np.cos(angle_m), np.sin(angle_m), 0])
        n = geometry_center + circle_radius * np.array([np.cos(angle_n), np.sin(angle_n), 0])
        p = geometry_center + circle_radius * np.array([np.cos(angle_p), np.sin(angle_p), 0])

        triangle = Polygon(m, n, p, color=YELLOW, stroke_width=5)

        m_dot = Dot(m, color=YELLOW, radius=0.07)
        n_dot = Dot(n, color=YELLOW, radius=0.07)
        p_dot = Dot(p, color=YELLOW, radius=0.07)

        m_label = MathTex("M", font_size=34).next_to(m_dot, UP, buff=0.12)
        n_label = MathTex("N", font_size=34).next_to(n_dot, LEFT, buff=0.12)
        p_label = MathTex("P", font_size=34).next_to(p_dot, RIGHT, buff=0.12)

        # Side length indicator near side NP
        side_mid = (n + p) / 2
        side_len_label = MathTex("9\\,\\text{cm}", font_size=32, color=YELLOW)
        side_len_label.move_to(side_mid + np.array([0.0, -0.35, 0.0]))

        # Radius OM
        radius_om = Line(geometry_center, m, color=RED, stroke_width=6)
        radius_label = MathTex("R", font_size=34, color=RED)
        radius_label.move_to((geometry_center + m) / 2 + np.array([0.28, 0.0, 0.0]))

        # -------- Step 1: write problem --------
        self.play(Write(problem_title), run_time=1.2)
        self.play(Write(problem_text), run_time=2.0)
        self.wait(0.4)

        # -------- Step 2: draw geometry --------
        self.play(Create(circle), run_time=1.4)
        self.play(FadeIn(o_dot), Write(o_label), run_time=0.8)

        self.play(Create(triangle), run_time=1.5)
        self.play(
            FadeIn(m_dot),
            FadeIn(n_dot),
            FadeIn(p_dot),
            Write(m_label),
            Write(n_label),
            Write(p_label),
            run_time=1.1,
        )
        self.play(FadeIn(side_len_label, shift=UP * 0.15), run_time=0.8)
        self.wait(0.3)

        # -------- Step 3: draw and highlight radius --------
        self.play(Create(radius_om), Write(radius_label), run_time=1.0)
        self.play(Indicate(radius_om, color=RED, scale_factor=1.04), run_time=0.9)
        self.wait(0.4)

        # -------- Step 4: show solution formulas --------
        solution_title = Text("Giai:", font_size=32, color=GREEN_B)
        solution_title.next_to(problem_text, DOWN, aligned_edge=LEFT, buff=0.55)

        formula_general = MathTex(r"R = \frac{a\sqrt{3}}{3}", font_size=40)
        formula_sub = MathTex(r"R = \frac{9\sqrt{3}}{3}", font_size=40)
        formula_final = MathTex(r"R = 3\sqrt{3}\,\text{cm}", font_size=42, color=YELLOW)

        formulas = VGroup(formula_general, formula_sub, formula_final).arrange(
            DOWN, aligned_edge=LEFT, buff=0.34
        )
        formulas.next_to(solution_title, DOWN, aligned_edge=LEFT, buff=0.26)

        self.play(Write(solution_title), run_time=0.7)
        self.play(FadeIn(formula_general, shift=0.15 * UP), run_time=0.9)
        self.play(TransformMatchingTex(formula_general.copy(), formula_sub), run_time=1.0)
        self.play(TransformMatchingTex(formula_sub.copy(), formula_final), run_time=1.0)
        self.play(Circumscribe(formula_final, color=YELLOW, buff=0.12), run_time=1.0)

        self.wait(1.8)
