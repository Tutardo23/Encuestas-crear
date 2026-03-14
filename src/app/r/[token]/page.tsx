// src/app/r/[token]/page.tsx
import { SurveyResponder } from "@/components/survey/SurveyResponder";
import { Metadata } from "next";

interface Props { params: { token: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Metadata genérica — no revelar info del survey en el título del tab
  return {
    title: "Encuesta",
    robots: { index: false, follow: false },
  };
}

export default function SurveyPublicPage({ params }: Props) {
  return <SurveyResponder token={params.token} />;
}
