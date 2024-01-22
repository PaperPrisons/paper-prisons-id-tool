import React, { useEffect, useState } from "react";
import Head from "next/head";
import PublicGoogleSheetsParser from "public-google-sheets-parser";
import Form from "../components/Form";

export default function App() {
  const [questions, setQuestions] = useState({});
  const [output, setOutput] = useState({});
  const [start, setStart] = useState(false);

  // https://docs.google.com/spreadsheets/d/1S9Ac06eAesmc4J8mgEdO6A083H2sfkPKEk7sbg3USGY/edit#gid=774227821
  // Convention
  // 1. All static questions must appear in front of the dynamic questions.
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
        "Answer Output Key-Yabo"
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

  const onStart = () => setStart(true);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,300"
          rel="stylesheet"
          type="text/css"
        />
      </Head>
      {!start ? (
        <div className="preface">
          <h1>
            <img
              className="question-item-logo"
              src="https://paperprisons.org/images/logo.png"
            />
            Reentry ID Tool Assistant
          </h1>
          <p>
            This tool is designed to simplify the process of getting an ID.
            Based on your answer to a few questions, we'll give you a summary of
            documents you will need to apply for an ID as well as instructions
            for filing the application. Hopefully it helps!
          </p>
          <p className="disclaimer">
            Disclaimer: Please note that no personal information will be
            captured or stored in this tool. Also, this tool is not equivalent
            to legal advice. For any feedback, please contact us via
            id@paperprisons.org
          </p>
          <button
            className="start-button dynamic-form-button"
            onClick={onStart}
          >
            Start
          </button>
        </div>
      ) : (
        <Form data={questions} output={output} />
      )}
    </>
  );
}
