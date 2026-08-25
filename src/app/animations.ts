import {
    trigger,
    transition,
    style,
    query,
    group,
    animateChild,
    animate,
    keyframes,
    state,
} from '@angular/animations';


// export const routeTransitionAnimations = trigger('routeAnimations', []);

export const fader =
    trigger('routeAnimations', [
        transition('* <=> *', [
            style({ position: 'relative' }),
            query(':enter, :leave', [
                style({
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                })
            ]
                , { optional: true }
            )
            ,
            query(':enter', [
                style({ 
                    opacity: 0,
                    transform: 'scale(0) translateY(100%)'
                })
              ], { optional: true }),
              query(':leave', animateChild(), { optional: true }),
              group([
                query(':leave', [
                  animate('600ms ease-out', style({ 
                    opacity: 0,
                    transform: 'scale(0) translateY(100%)'
                }))
                ], { optional: true }),
                query(':enter', [
                  animate('600ms ease-out', style({ 
                    opacity: 1,
                    transform: 'scale(1) translateY(0)'
                }))
                ], { optional: true }),
                query('@*', animateChild(), { optional: true })
              ]),
        ])
    ]);

 
export const flip = 
trigger('routeAnimations', [
    transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
            style({
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                // background: 'white'
            })
        ]
            , { optional: true }
        )
        ,
        query(':enter', [
            style({ 
                // overflow: 'hidden',
                opacity: 0,
                transform: 'translateX(100%) rotate3D(0, 1, 0, 90deg)',
            })
          ], { optional: true }),
          query(':leave', animateChild(), { optional: true }),
          group([
            query(':leave', [
              animate('1000ms ease-out', style({ 
                // overflow: 'hidden',
                opacity: 0,
                transform: 'translateX(-100%) rotate3D(0, 1, 0, 90deg)'
            }))
            ], { optional: true }),
            query(':enter', [
              animate('1000ms ease-out', style({ 
                // overflow: 'hidden',
                opacity: 1,
                transform: 'translateX(0)  rotate3D(0, 1, 0, 0deg)'
            }))
            ], { optional: true }),
            // query('@*', animateChild(), { optional: true })
          ]),
    ])
]);
