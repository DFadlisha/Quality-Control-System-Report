# SortMaster App Blueprint

## Overview

SortMaster is a Flutter application designed for quality control and inventory management in a manufacturing environment. It allows users to log sorting activities, track non-good (NG) parts, and view production data.

## Style and Design

*   **Theme:** The app uses a Material 3 theme with a deep purple seed color. It supports both light and dark modes.
*   **Typography:** The app uses the Google Fonts `Oswald` for display and headlines, `Roboto` for titles and buttons, and `Open Sans` for body text.
*   **Layout:** The app uses a clean, card-based layout for displaying data and forms.

## Features

*   **Authentication:** The app uses Firebase Authentication to manage user sign-in.
*   **Quality Scanning:** Users can scan barcodes to populate part information, log sorting data (total sorted, NG quantity, NG type), and attach images of NG parts.
*   **PDF Generation:** Users can generate a PDF summary of a sorting log.
*   **Management Dashboard:** A dashboard provides an overview of production data, including total sorted parts, total NG parts, NG rate, and an hourly production trend chart.

## Current Plan

I have addressed all the initial build errors and warnings in the codebase. I have also implemented the PDF generation functionality. My next step is to create a blueprint to document the work that has been done.
