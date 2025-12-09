Feature: Application Smoke Test

  Scenario: App loads successfully
    Given I am on the Main Menu
    Then I should see the Main Menu container
    And the page title should contain "space2"
    And I should see the Game Canvas
    And I should see the Navball
