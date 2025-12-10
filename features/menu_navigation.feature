Feature: Main Menu Navigation
  As a player
  I want to navigate through the main menu in two steps
  So that I can clearly distinguish between starting/loading and playing

  Scenario: Initial Menu State (Home Screen)
    Given I am on the Main Menu
    Then I should see the "New Game" button
    And I should see the "Load Game" button
    And I should see the "Settings" button
    And I should NOT see the "Build Rocket" button
    And I should NOT see the "Chronology" button

  Scenario: Navigation to Hub Screen via New Game
    Given I am on the Main Menu
    When I click "New Game"
    Then I should be on the Hub Screen
    And I should see the "Continue / Play" button
    And I should see the "Build Rocket" button
    And I should see the "Chronology" button
    And I should NOT see the "New Game" button

  Scenario: Return to Home Screen (Optional Check)
    Given I am on the Hub Screen
    When I click "Back"
    And I click "Confirm"
    Then I should be on the Main Menu
