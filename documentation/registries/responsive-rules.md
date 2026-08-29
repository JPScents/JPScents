# Responsive-rule Registry

| Area               | Desktop                                     | Mobile                                              |
| ------------------ | ------------------------------------------- | --------------------------------------------------- |
| Public shell       | centred navigation and Cart utility         | compact header and menu                             |
| Product grids      | designed multi-column gallery/catalogue     | stacked or compact list/card composition            |
| Product detail     | image and purchase information side-by-side | sequential content with touch-sized controls        |
| Cart preview       | right-side drawer                           | bottom sheet/slide-up panel                         |
| Full Cart/Checkout | content plus summary columns                | single flow with summary repositioned               |
| Help Me Choose     | broad selectable layout                     | stacked touch selections                            |
| Admin shell        | fixed sidebar/topbar                        | compact header/menu                                 |
| Admin operations   | fixed-lane rows/tables                      | operational cards; not horizontally squeezed tables |
| Modals             | centred constrained dialog                  | viewport-conscious dialog/sheet sizing              |

Breakpoints should be chosen from Tailwind defaults only where they reproduce the Paper transitions. Do not create device-specific duplicate components when composition can be expressed as variants of one family.
