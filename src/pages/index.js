import React, { useEffect, useState } from "react";
import PublicGoogleSheetsParser from "public-google-sheets-parser";
import Form from "../components/Form";

export default function App() {
  const [questions, setQuestions] = useState({});
  const [output, setOutput] = useState({});

  // https://docs.google.com/spreadsheets/d/1S9Ac06eAesmc4J8mgEdO6A083H2sfkPKEk7sbg3USGY/edit#gid=774227821
  // Convention
  // 1. All static questions must be appeared in front of the dynamic questions.
  // 2. Only one static question can control the entry point of the dynamic questions.
  // 3. If a question can control the flow of the dynamic questions, all options under it should be either an option key (such as A1/A2/..., etc.) or #End
  useEffect(() => {
    const parser = new PublicGoogleSheetsParser();
    parser
      .parse(
        "1S9Ac06eAesmc4J8mgEdO6A083H2sfkPKEk7sbg3USGY",
        "Questions-Cloned-Yabo"
      )
      .then((items) => {
        const questions = {
          static: [],
          dynamic: {},
          raw: [],
        };
        items.forEach((item, index) => {
          const question = {
            id: item["Unique ID"],
            staticId: index,
            title: item.Question,
            description: item["Sub Description"],
            type: item.Type,
            isStatic: item.QuestionFlowType === "Static",
            options: Object.keys(item)
              .filter((key) => key.startsWith("A"))
              .map((key) => {
                const rawOption = item[key].trim();
                const match = rawOption.match(/^(.*?)\s*{{(.*?)}}$/);
                if (match) {
                  const matchedKey = match[1].trim();
                  const matchedValue = match[2].trim();
                  return {
                    label: matchedKey,
                    value: matchedValue,
                    option: key,
                  };
                }
                return { label: rawOption, value: rawOption, option: key };
              }),
          };
          questions.dynamic[question.id] = question;
          if (question.isStatic) {
            questions.static.push(question);
          }
          questions.raw.push(question);
        });
        setQuestions(questions);
      });
  }, []);

  useEffect(() => {
    const parser = new PublicGoogleSheetsParser();
    parser
      .parse(
        "1S9Ac06eAesmc4J8mgEdO6A083H2sfkPKEk7sbg3USGY",
        "Answer Output Key"
      )
      .then((items) => {
        const outputs = {};
        items.forEach((item) => {
          const id = item["Question Unique ID (For reference purpose only)"];
          const question = {
            id,
            title: item.Question,
            options: Object.keys(item)
              .filter((key) => key.startsWith("A"))
              .reduce((acc, key) => {
                acc[key.replace(" Output", "").trim()] = item[key].trim();
                return acc;
              }, {}),
          };
          outputs[id] = question;
        });
        setOutput(outputs);
      });
  }, []);

  return (
    <>
      <Form data={questions} output={output} />
    </>
  );
}
